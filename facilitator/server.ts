// Verge standalone facilitator binary
//
// Minimal HTTP-402 settlement server: only /facilitator/{supported,verify,settle}.
// No database, no console, no landing — challenges are signed and held in
// memory with TTL; replay protection is per-process (single-node deployments
// or front with Redis when scaling horizontally).
//
// Build:  cd facilitator && npm install && npm run build
// Run:    FACILITATOR_PORT=3399 node dist/server.js
// Docker: docker build -f facilitator/Dockerfile -t verge-facilitator .

import Fastify from "fastify";
import {
  settleX402Payment,
  verifyX402Payment,
  buildChallenge,
  getRail,
  networkFromCaip2,
  type X402PaymentPayload,
  type X402PaymentRequirements,
  type Challenge,
  type ChallengeStore,
  type ReplayStore,
} from "@vergex402/core";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.FACILITATOR_PORT ?? 3399);
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

const log = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) =>
  console[level](`[${new Date().toISOString()}] ${msg}`, JSON.stringify(extra ?? {}));

// ── In-memory stores (dev / single-node default) ────────────────────────────

const challenges = new Map<string, { challenge: Challenge; expiresAt: number }>();
const replayKeys = new Set<string>();

const challengeStore: ChallengeStore = {
  async add(challenge) {
    for (const [nonce, entry] of challenges) if (entry.expiresAt <= Date.now()) challenges.delete(nonce);
    if (challenges.size >= 50_000) {
      const oldest = challenges.keys().next().value;
      if (oldest) challenges.delete(oldest);
    }
    challenges.set(challenge.nonce, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  },
  async consume(nonce, expected) {
    const entry = challenges.get(nonce);
    challenges.delete(nonce);
    const c = entry?.challenge;
    if (!entry || entry.expiresAt <= Date.now() || !c) return null;
    if (c.network !== expected.network || c.recipient.toLowerCase() !== expected.recipient.toLowerCase() || c.amount !== expected.amount) return null;
    return c;
  },
};

const replayStore: ReplayStore = {
  async has(key) { return replayKeys.has(key); },
  async add(key) { replayKeys.add(key); },
};

// ── HTTP server ──────────────────────────────────────────────────────────────

const app = Fastify({ logger: false, bodyLimit: MAX_BODY_BYTES });

app.addHook("onRequest", async (req, reply) => {
  // Public facilitator — only these three routes exist.
  const allowed = ["/facilitator/supported", "/facilitator/verify", "/facilitator/settle", "/facilitator/challenge", "/health"];
  if (!allowed.includes(req.url.split("?")[0])) {
    return reply.code(404).send({ error: "Not found" });
  }
  const cl = req.headers["content-length"];
  if (cl && Number(cl) > MAX_BODY_BYTES) {
    return reply.code(413).send({ error: "Body too large" });
  }
});

app.get("/health", async () => ({
  ok: true,
  service: "verge-facilitator",
  challenges: challenges.size,
  settled: replayKeys.size,
  uptime: Math.floor(process.uptime()),
}));

app.get("/facilitator/supported", async () => {
  const base = { x402Version: 2, scheme: "exact" };
  const rails = ["robinhood-mainnet", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet", "polygon-mainnet", "solana-mainnet", "sui-mainnet"];
  return {
    ...base,
    kinds: rails.map((network) => {
      const rail = getRail(network);
      return {
        network,
        scheme: "exact",
        asset: rail.asset,
        token: ("tokenContract" in rail ? rail.tokenContract : undefined),
        decimals: rail.decimals,
      };
    }),
  };
});

interface VerifyBody {
  x402Version?: number;
  paymentPayload?: X402PaymentPayload;
  paymentRequirements?: X402PaymentRequirements;
}

app.post("/facilitator/verify", async (req, reply) => {
  const body = req.body as VerifyBody;
  if (!body?.paymentPayload || !body?.paymentRequirements) {
    return reply.code(400).send({ isValid: false, errorReason: "paymentPayload and paymentRequirements are required" });
  }
  // verifyX402Payment consumes the nonce from the store — use a passthrough
  // store here so verify stays read-only and settle can still claim it.
  const passthroughChallengeStore: ChallengeStore = {
    add: async (c) => { await challengeStore.add(c); },
    consume: async (nonce, expected) => {
      const entry = challenges.get(nonce);
      const c = entry?.challenge;
      if (!entry || entry.expiresAt <= Date.now() || !c) return null;
      if (c.network !== expected.network || c.recipient.toLowerCase() !== expected.recipient.toLowerCase() || c.amount !== expected.amount) return null;
      return c; // do NOT delete — verify must not consume
    },
  };
  const check = await verifyX402Payment(
    { challengeStore: passthroughChallengeStore, replayStore, realm: "verge-standalone" },
    body.paymentPayload,
    body.paymentRequirements,
  );
  return { isValid: check.isValid, errorReason: check.invalidReason, payer: check.payer };
});

app.post("/facilitator/settle", async (req, reply) => {
  const body = req.body as VerifyBody;
  if (!body?.paymentPayload || !body?.paymentRequirements) {
    return reply.code(400).send({ success: false, errorReason: "paymentPayload and paymentRequirements are required", transaction: "", network: "unknown" });
  }
  const result = await settleX402Payment(
    { challengeStore, replayStore, realm: "verge-standalone" },
    body.paymentPayload,
    body.paymentRequirements,
  );
  log(result.success ? "info" : "warn", result.success ? "settled" : "settle failed", {
    tx: result.transaction,
    network: result.network,
    payer: result.payer,
  });
  return result;
});

// Challenge issuance helper — lets merchant servers obtain a signed challenge
// without importing the full SDK. GET /facilitator/challenge?network=&recipient=&amount=
app.get("/facilitator/challenge", async (req, reply) => {
  const q = req.query as Record<string, string>;
  const network = networkFromCaip2(q.network ?? "") ?? "robinhood-mainnet";
  const rail = getRail(network);
  const amount = Number(q.amount);
  const recipient = q.recipient ?? "";
  if (!Number.isFinite(amount) || amount <= 0 || !/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    return reply.code(400).send({ error: "Valid ?network=&recipient=0x..&amount= required" });
  }
  const nonce = randomBytes(16).toString("hex");
  const opts = { amount, recipient, network, challengeStore, replayStore, realm: "verge-standalone" };
  const challenge = buildChallenge(opts, "verge-standalone", network);
  challenge.nonce = nonce;
  await challengeStore.add(challenge);
  return { challenge, paymentRequiredHeader: Buffer.from(JSON.stringify(challenge)).toString("base64") };
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    log("info", `verge-facilitator listening on :${PORT}`);
  } catch (err) {
    log("error", "failed to start", { err });
    process.exit(1);
  }
};

start();
