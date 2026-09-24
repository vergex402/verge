// @vergex402/hono — Hono middleware for HTTP 402 micropayments on Robinhood Chain.
//
// Usage:
//
//   import { Hono } from "hono";
//   import { paywall } from "@vergex402/hono";
//
//   const app = new Hono();
//   app.use("/api/premium", paywall({
//     amount: 0.001,
//     recipient: process.env.WALLET!,
//     network: "robinhood-mainnet",
//   }));
//
// This is a thin Hono adapter over @vergex402/core, which does the actual challenge
// issuance and on-chain USDG verification. Same logic is shared with @vergex402/express.

import { decodePaymentSignature, evaluatePayment, extractProof, type PaywallOptions, type ReplayStore } from "@vergex402/core";

export type { PaywallOptions, ReplayStore };

// Minimal structural types so this package has no hard dependency on `hono`.
interface HonoLikeContext {
  req: { header(name: string): string | undefined; url: string };
  json(body: unknown, status?: 402): unknown;
  header(name: string, value: string): void;
}
type HonoLikeNext = () => Promise<void>;
type HonoLikeHandler = (c: HonoLikeContext, next: HonoLikeNext) => Promise<unknown>;

export function paywall(opts: PaywallOptions): HonoLikeHandler {
  return async (c, next) => {
    // Dual dialect: standard x402 v2 PAYMENT-SIGNATURE, or legacy X-Pay-* headers.
    const sig = c.req.header("payment-signature");
    const payload = decodePaymentSignature(sig || "");
    const proof = extractProof(payload, c.req.header("x-pay-tx"), c.req.header("x-pay-nonce"));

    const outcome = await evaluatePayment(opts, proof.tx, proof.nonce, { url: c.req.url });

    if ((outcome as { kind: string }).kind === "nonce_invalid") {
      return c.json({ error: "Payment nonce is unknown or expired", code: "NONCE_INVALID" }, 402);
    }

    switch (outcome.kind) {
      case "challenge": {
        for (const [key, value] of Object.entries(outcome.headers)) c.header(key, value);
        return c.json({ error: "Payment required", code: "PAYMENT_REQUIRED", challenge: outcome.challenge }, 402);
      }
      case "nonce_required":
        return c.json({ error: "Payment nonce required", code: "NONCE_REQUIRED" }, 402);
      case "replayed":
        return c.json({ error: "Transaction already used", code: "TX_REPLAYED" }, 402);
      case "invalid":
        return c.json({ error: "Tx verification failed", code: "TX_INVALID" }, 402);
      case "error":
        return c.json({ error: "Verification error", code: "TX_ERROR", detail: outcome.detail }, 402);
      case "unlocked":
        await next();
        return;
    }
  };
}
