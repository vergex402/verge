/**
 * @vergex402/ai-sdk — server-side: create a Next.js / Hono route handler that
 * gates any AI SDK streaming call behind an x402 payment.
 *
 * Usage (Next.js App Router):
 *
 * ```ts
 * // app/api/ai/route.ts
 * import { createX402Gate } from "@vergex402/ai-sdk/server";
 *
 * const { POST } = createX402Gate({
 *   amount: 0.001,      // USDG per call
 *   recipient: "0x...", // your payout wallet
 * });
 * export { POST };
 * ```
 *
 * Usage (Hono):
 * ```ts
 * import { honoX402Gate } from "@vergex402/ai-sdk/server";
 * app.use("/api/ai/*", honoX402Gate({ amount: 0.001, recipient: "0x..." }));
 * ```
 */

import type { X402GateOptions, SettlementProof } from './types.js';

const DEFAULT_FACILITATOR = 'https://vergesnowy.com/api/facilitator';
const DEFAULT_NETWORK = 'robinhood-mainnet';

// ── Shared nonce→settlementProof store (in-memory, per-worker) ────────────
const settled = new Map<string, SettlementProof>();

function makeNonce(): string {
  return `vg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Encode the PAYMENT-REQUIRED header value (x402 v2 wire format) */
function encodePaymentRequired(opts: X402GateOptions, nonce: string): string {
  const payload = {
    x402Version: 2,
    scheme: 'exact',
    network: opts.network ?? DEFAULT_NETWORK,
    amount: String(Math.round(opts.amount * 1_000_000)), // atomic USDG (6 decimals)
    asset: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', // USDG on Robinhood
    recipient: opts.recipient,
    nonce,
    memo: opts.memo ?? 'Verge x402 AI call',
    facilitator: DEFAULT_FACILITATOR,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/** Verify PAYMENT-SIGNATURE against the Verge hosted facilitator */
async function verifyPayment(
  signature: string,
  opts: X402GateOptions,
  nonce: string,
): Promise<SettlementProof | null> {
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
    return {
      txHash: data.txHash ?? '',
      payer: data.payer ?? '',
      amountUsdg: data.amount ?? opts.amount,
      network: opts.network ?? DEFAULT_NETWORK,
      settledAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ── Next.js App Router handler ──────────────────────────────────────────────

/**
 * Returns `{ POST }` — drop into a Next.js route file.
 * Every request without a valid PAYMENT-SIGNATURE receives HTTP 402 with
 * the payment challenge. Paid requests are passed through to the `handler`
 * callback you supply.
 */
export function createX402Gate(
  opts: X402GateOptions,
  handler?: (req: Request, proof: SettlementProof) => Promise<Response>,
): { POST: (req: Request) => Promise<Response> } {
  return {
    async POST(req: Request): Promise<Response> {
      const sig = req.headers.get('payment-signature');

      if (!sig) {
        // Issue a fresh 402 challenge
        const nonce = makeNonce();
        const pr = encodePaymentRequired(opts, nonce);
        return new Response(JSON.stringify({ error: 'payment required', nonce }), {
          status: 402,
          headers: {
            'content-type': 'application/json',
            'payment-required': pr,
            'access-control-expose-headers': 'payment-required',
          },
        });
      }

      // Decode nonce from sig payload so we can verify
      let nonce = '';
      try {
        const decoded = JSON.parse(Buffer.from(sig, 'base64').toString());
        nonce = decoded.nonce ?? '';
      } catch {/* fall through — verifyPayment will reject */}

      // Replay protection
      if (settled.has(nonce)) {
        return new Response(JSON.stringify({ error: 'nonce already used' }), {
          status: 402,
          headers: { 'content-type': 'application/json' },
        });
      }

      const proof = await verifyPayment(sig, opts, nonce);
      if (!proof) {
        return new Response(JSON.stringify({ error: 'payment verification failed' }), {
          status: 402,
          headers: { 'content-type': 'application/json' },
        });
      }

      settled.set(nonce, proof);
      // TTL: evict after 10 min
      setTimeout(() => settled.delete(nonce), 10 * 60 * 1000);

      if (handler) return handler(req, proof);

      // Default: pass through with proof headers
      return new Response(JSON.stringify({ ok: true, proof }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-payment-proof': JSON.stringify(proof),
        },
      });
    },
  };
}

/**
 * Hono middleware. Example:
 * ```ts
 * app.use("/ai/*", honoX402Gate({ amount: 0.001, recipient: "0x..." }));
 * ```
 */
export function honoX402Gate(opts: X402GateOptions) {
  const { POST } = createX402Gate(opts);
  return async (c: { req: { raw: Request }; res: Response }, next: () => Promise<void>) => {
    if (c.req.raw.method !== 'POST') return next();
    const res = await POST(c.req.raw);
    if (res.status !== 200) {
      c.res = res;
      return;
    }
    await next();
  };
}
