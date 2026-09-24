// @vergex402/express — Express middleware for HTTP 402 micropayments on Robinhood Chain.
//
// Usage:
//
//   import { paywall } from "@vergex402/express";
//
//   app.use("/api/premium", paywall({
//     amount: 0.001,
//     recipient: process.env.WALLET!,
//     network: "robinhood-mainnet",
//   }));
//
// This is a thin Express adapter over @vergex402/core, which does the actual challenge
// issuance and on-chain USDG verification. Same logic is shared with @vergex402/hono.

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { decodePaymentSignature, evaluatePayment, extractProof, type PaywallOptions, type ReplayStore } from "@vergex402/core";

export type { PaywallOptions, ReplayStore };

export function paywall(opts: PaywallOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Dual dialect: standard x402 v2 PAYMENT-SIGNATURE, or legacy X-Pay-* headers.
    const sig = req.header("payment-signature");
    const payload = decodePaymentSignature(sig || "");
    const proof = extractProof(payload, req.header("x-pay-tx"), req.header("x-pay-nonce"));

    const outcome = await evaluatePayment(opts, proof.tx, proof.nonce, { url: `${req.protocol}://${req.get("host")}${req.originalUrl}` });

    if ((outcome as { kind: string }).kind === "nonce_invalid") {
      res.status(402).json({ error: "Payment nonce is unknown or expired", code: "NONCE_INVALID" });
      return;
    }

    switch (outcome.kind) {
      case "challenge": {
        res.status(402);
        res.set(outcome.headers);
        res.json({ error: "Payment required", code: "PAYMENT_REQUIRED", challenge: outcome.challenge });
        return;
      }
      case "nonce_required":
        res.status(402).json({ error: "Payment nonce required", code: "NONCE_REQUIRED" });
        return;
      case "replayed":
        res.status(402).json({ error: "Transaction already used", code: "TX_REPLAYED" });
        return;
      case "invalid":
        res.status(402).json({ error: "Tx verification failed", code: "TX_INVALID" });
        return;
      case "error":
        res.status(402).json({ error: "Verification error", code: "TX_ERROR", detail: outcome.detail });
        return;
      case "unlocked":
        next();
        return;
    }
  };
}

export type { Request, Response, NextFunction } from "express";
