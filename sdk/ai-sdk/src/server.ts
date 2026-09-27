/**
 * @vergex402/ai-sdk server-side x402 payment gate.
 *
 * The bundled stores are process-local and are only appropriate for development
 * or one worker. Pass durable @vergex402/core-compatible stores in production.
 */

import { randomBytes } from 'node:crypto';
import type { AtomicReplayStore, Challenge, ChallengeStore, ReplayStore } from '@vergex402/core';
import type { X402GateOptions, SettlementProof } from './types.js';

const DEFAULT_FACILITATOR = 'https://vergesnowy.com/api/facilitator';
const DEFAULT_NETWORK = 'robinhood-mainnet';
const USDG_TOKEN = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';

// Development/single-worker defaults only. Durable stores must be supplied for
// multi-worker deployments.
const settled = new Set<string>();
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_LOCAL_CHALLENGES = 10_000;
const challenges = new Map<string, { challenge: Challenge; expiresAt: number }>();
const defaultReplayStore: AtomicReplayStore = {
  has: (key) => settled.has(key),
  add: (key) => { settled.add(key); },
  claim: (key) => {
    if (settled.has(key)) return false;
    settled.add(key);
    return true;
  },
};
const defaultChallengeStore: ChallengeStore = {
  add: (challenge) => {
    const now = Date.now();
    // Bound the development fallback even under unauthenticated challenge spam.
    for (const [nonce, entry] of challenges) if (entry.expiresAt <= now) challenges.delete(nonce);
    if (challenges.size >= MAX_LOCAL_CHALLENGES) {
      const oldest = challenges.keys().next().value;
      if (oldest) challenges.delete(oldest);
    }
    challenges.set(challenge.nonce, { challenge, expiresAt: now + CHALLENGE_TTL_MS });
  },
  consume: (nonce, expected) => {
    const entry = challenges.get(nonce);
    challenges.delete(nonce);
    const challenge = entry?.challenge;
    if (!entry || entry.expiresAt <= Date.now() || !challenge || challenge.network !== expected.network ||
      challenge.recipient.toLowerCase() !== expected.recipient.toLowerCase() ||
      challenge.amount !== expected.amount) return null;
    return challenge;
  },
};

function isAtomicReplayStore(store: ReplayStore): store is AtomicReplayStore {
  return typeof (store as Partial<AtomicReplayStore>).claim === 'function';
}

function makeNonce(): string {
  return `vg_${randomBytes(18).toString('base64url')}`;
}

/** Encode the PAYMENT-REQUIRED header value (x402 v2 wire format). */
function encodePaymentRequired(opts: X402GateOptions, nonce: string): string {
  const payload = {
    x402Version: 2,
    scheme: 'exact',
    network: opts.network ?? DEFAULT_NETWORK,
    amount: String(Math.round(opts.amount * 1_000_000)),
    asset: USDG_TOKEN,
    recipient: opts.recipient,
    nonce,
    memo: opts.memo ?? 'Verge x402 AI call',
    facilitator: opts.facilitatorUrl ?? DEFAULT_FACILITATOR,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function makeChallenge(opts: X402GateOptions, nonce: string): Challenge {
  return {
    nonce,
    amount: opts.amount,
    token: 'USDG',
    tokenRef: USDG_TOKEN,
    network: (opts.network ?? DEFAULT_NETWORK) as Challenge['network'],
    chainId: 4663,
    recipient: opts.recipient,
    memo: opts.memo ?? 'Verge x402 AI call',
  };
}

/** Verify PAYMENT-SIGNATURE against the Verge hosted facilitator. */
async function verifyPayment(signature: string, opts: X402GateOptions, nonce: string): Promise<SettlementProof | null> {
  const facilitatorUrl = opts.facilitatorUrl ?? DEFAULT_FACILITATOR;
  try {
    const res = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Verge-AI-SDK/1.0' },
      body: JSON.stringify({
        x402Version: 2,
        scheme: 'exact',
        network: opts.network ?? DEFAULT_NETWORK,
        payload: JSON.parse(Buffer.from(signature, 'base64').toString()),
        nonce,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { valid?: boolean; txHash?: string; payer?: string; amount?: number };
    if (!data.valid) return null;
    return { txHash: data.txHash ?? '', payer: data.payer ?? '', amountUsdg: data.amount ?? opts.amount, network: opts.network ?? DEFAULT_NETWORK, settledAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/** Returns a Next.js App Router POST handler that gates a paid AI request. */
export function createX402Gate(
  opts: X402GateOptions,
  handler?: (req: Request, proof: SettlementProof) => Promise<Response>,
): { POST: (req: Request) => Promise<Response> } {
  const challengeStore = opts.challengeStore ?? defaultChallengeStore;
  const replayStore = opts.replayStore ?? defaultReplayStore;

  return {
    async POST(req: Request): Promise<Response> {
      const sig = req.headers.get('payment-signature');
      if (!sig) {
        const nonce = makeNonce();
        await challengeStore.add(makeChallenge(opts, nonce));
        return new Response(JSON.stringify({ error: 'payment required', nonce }), {
          status: 402,
          headers: { 'content-type': 'application/json', 'payment-required': encodePaymentRequired(opts, nonce), 'access-control-expose-headers': 'payment-required' },
        });
      }

      let nonce = '';
      try { nonce = JSON.parse(Buffer.from(sig, 'base64').toString()).nonce ?? ''; } catch { /* verification rejects malformed signatures */ }
      const proof = await verifyPayment(sig, opts, nonce);
      if (!proof) return new Response(JSON.stringify({ error: 'payment verification failed' }), { status: 402, headers: { 'content-type': 'application/json' } });

      // Consume the issued challenge before settling. Durable stores make this
      // check shared across workers; an AtomicReplayStore also closes replay races.
      const challenge = await challengeStore.consume(nonce, {
        network: (opts.network ?? DEFAULT_NETWORK) as Challenge['network'], recipient: opts.recipient, amount: opts.amount,
      });
      if (!challenge) return new Response(JSON.stringify({ error: 'nonce invalid or already used' }), { status: 402, headers: { 'content-type': 'application/json' } });

      const claimed = isAtomicReplayStore(replayStore)
        ? await replayStore.claim(nonce)
        : !(await replayStore.has(nonce));
      if (!claimed) return new Response(JSON.stringify({ error: 'nonce already used' }), { status: 402, headers: { 'content-type': 'application/json' } });
      if (!isAtomicReplayStore(replayStore)) await replayStore.add(nonce);
      if (replayStore === defaultReplayStore) setTimeout(() => settled.delete(nonce), 10 * 60 * 1000);

      if (handler) return handler(req, proof);
      return new Response(JSON.stringify({ ok: true, proof }), { status: 200, headers: { 'content-type': 'application/json', 'x-payment-proof': JSON.stringify(proof) } });
    },
  };
}

/** Hono middleware. */
export function honoX402Gate(opts: X402GateOptions) {
  const { POST } = createX402Gate(opts);
  return async (c: { req: { raw: Request }; res: Response }, next: () => Promise<void>) => {
    if (c.req.raw.method !== 'POST') return next();
    const res = await POST(c.req.raw);
    if (res.status !== 200) { c.res = res; return; }
    await next();
  };
}
