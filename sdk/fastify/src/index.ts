// @vergex402/fastify — Fastify v4 plugin for HTTP 402 micropayments on Robinhood Chain.
//
// Usage:
//
//   import Fastify from "fastify";
//   import { paywall } from "@vergex402/fastify";
//
//   const app = Fastify();
//
//   // Register as a route-scoped plugin:
//   app.register(async (instance) => {
//     instance.addHook("onRequest", paywall({
//       amount: 0.001,
//       recipient: process.env.WALLET!,
//       network: "robinhood-mainnet",
//     }));
//
//     instance.get("/api/premium", async (req, reply) => {
//       return { data: "protected content" };
//     });
//   });
//
//   // Or apply globally via the exported plugin wrapper:
//   app.register(import("@vergex402/fastify").then(m => m.paywallPlugin), {
//     amount: 0.001,
//     recipient: process.env.WALLET!,
//     network: "robinhood-mainnet",
//   });
//
// This is a thin Fastify v4 adapter over @vergex402/core, which does the actual challenge
// issuance and on-chain USDG verification. Same logic is shared with @vergex402/express
// and @vergex402/hono.
//
// The hook uses Fastify's onRequest lifecycle stage (before body parsing) so payment
// is verified before any expensive work. Structural typing is used for FastifyRequest
// and FastifyReply so there is no hard runtime dependency on the fastify package.

import fp from "fastify-plugin";
import {
  decodePaymentSignature,
  evaluatePayment,
  extractProof,
  type PaywallOptions,
  type ReplayStore,
} from "@vergex402/core";

export type { PaywallOptions, ReplayStore };

// ---------------------------------------------------------------------------
// Minimal structural types — no hard runtime dep on `fastify` package.
// ---------------------------------------------------------------------------

interface FastifyLikeRequest {
  headers: Record<string, string | string[] | undefined>;
  url: string;
}

interface FastifyLikeReply {
  code(statusCode: number): FastifyLikeReply;
  send(payload?: unknown): FastifyLikeReply;
  header(key: string, value: string): FastifyLikeReply;
}

type DoneCallback = (err?: Error) => void;

// onRequest hook signature used by Fastify v4
type FastifyOnRequestHook = (
  request: FastifyLikeRequest,
  reply: FastifyLikeReply,
  done: DoneCallback,
) => void | Promise<void>;

// Minimal Fastify instance surface needed to register hooks
interface FastifyLikeInstance {
  addHook(name: "onRequest", hook: FastifyOnRequestHook): void;
}

// ---------------------------------------------------------------------------
// Helper: read a single-valued header (Fastify headers can be string | string[])
// ---------------------------------------------------------------------------
function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const val = headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return val;
}

// ---------------------------------------------------------------------------
// paywall() — returns an onRequest hook directly.
//
// Use this when you want to add the hook manually:
//
//   instance.addHook("onRequest", paywall({ amount, recipient, network }));
// ---------------------------------------------------------------------------
export function paywall(opts: PaywallOptions): FastifyOnRequestHook {
  return async (request, reply, done) => {
    // Dual dialect: standard x402 v2 PAYMENT-SIGNATURE, or legacy X-Pay-* headers.
    const sig = getHeader(request.headers, "payment-signature");
    const payload = decodePaymentSignature(sig || "");
    const proof = extractProof(
      payload,
      getHeader(request.headers, "x-pay-tx"),
      getHeader(request.headers, "x-pay-nonce"),
    );

    const outcome = await evaluatePayment(opts, proof.tx, proof.nonce, {
      url: request.url,
    });

    if ((outcome as { kind: string }).kind === "nonce_invalid") {
      reply
        .code(402)
        .send({ error: "Payment nonce is unknown or expired", code: "NONCE_INVALID" });
      return;
    }

    switch (outcome.kind) {
      case "challenge": {
        for (const [key, value] of Object.entries(outcome.headers)) {
          reply.header(key, value);
        }
        reply.code(402).send({
          error: "Payment required",
          code: "PAYMENT_REQUIRED",
          challenge: outcome.challenge,
        });
        return;
      }
      case "nonce_required":
        reply
          .code(402)
          .send({ error: "Payment nonce required", code: "NONCE_REQUIRED" });
        return;
      case "replayed":
        reply
          .code(402)
          .send({ error: "Transaction already used", code: "TX_REPLAYED" });
        return;
      case "invalid":
        reply
          .code(402)
          .send({ error: "Tx verification failed", code: "TX_INVALID" });
        return;
      case "error":
        reply.code(402).send({
          error: "Verification error",
          code: "TX_ERROR",
          detail: outcome.detail,
        });
        return;
      case "unlocked":
        done();
        return;
    }
  };
}

// ---------------------------------------------------------------------------
// paywallPlugin — fastify-plugin wrapper so Fastify's encapsulation is escaped
// and the hook applies to the entire app (or a sub-scope if registered there).
//
// Usage:
//   import { paywallPlugin } from "@vergex402/fastify";
//   app.register(paywallPlugin, { amount: 0.001, recipient: "0x...", network: "..." });
// ---------------------------------------------------------------------------
export const paywallPlugin = fp(
  async (fastify: FastifyLikeInstance, opts: PaywallOptions) => {
    fastify.addHook("onRequest", paywall(opts));
  },
  { name: "@vergex402/fastify" },
);
