// Real USDG payment demo on Robinhood Chain.
//
// First call returns HTTP 402 with a challenge in BOTH dialects: the x402 v2
// PAYMENT-REQUIRED header (base64 PaymentRequired) plus the legacy X-Pay-* set.
// Retry with PAYMENT-SIGNATURE (base64 PaymentPayload) or X-Pay-Tx + X-Pay-Nonce
// verifies the settlement on-chain.

import { NextRequest } from "next/server";
import { buildChallenge, challengeHeadersV2, decodePaymentSignature, defaultChallengeStore, defaultReplayStore, evaluatePayment, extractProof } from "@vergex402/core";
import { checkApiKey } from "@/app/lib/api-key";
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import { recordSettlement } from "@/app/lib/reputation";

export const runtime = "nodejs";

const PRICE_USDG = 0.001;
const NETWORK = "robinhood-mainnet";

export function publicOrigin(req: NextRequest): string {
  const xfHost = req.headers.get("x-forwarded-host");
  const xfProto = req.headers.get("x-forwarded-proto") || "https";
  if (xfHost) return `${xfProto.split(",")[0].trim()}://${xfHost.split(",")[0].trim()}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  // Cheap challenges are free to mint; cap challenge-minting spam per IP.
  if (!(await allowRateLimit(`demo:${requestIp(req)}`, 30))) return rateLimitResponse();

  const apiKey = req.headers.get("x-api-key");

  // An API key bypasses per-call USDG payment but is quota-metered per wallet.
  if (apiKey) {
    const check = await checkApiKey(apiKey);
    if (!check.ok) {
      const status = check.error === "QUOTA_EXCEEDED" ? 429 : 401;
      return Response.json({ error: "API key rejected", code: check.error }, { status });
    }
    return Response.json({
      ok: true,
      network: NETWORK,
      auth: "api-key",
      wallet: check.wallet,
      quota: { remaining: check.remaining, limit: check.limit },
      payload: { message: "Authorized via metered API key. Premium endpoint unlocked." },
    }, { headers: { "X-RateLimit-Remaining": String(check.remaining), "X-RateLimit-Limit": String(check.limit) } });
  }

  const sig = req.headers.get("payment-signature");
  const payload = decodePaymentSignature(sig || "");
  const proof = extractProof(payload, req.headers.get("x-pay-tx"), req.headers.get("x-pay-nonce"));

  const outcome = await evaluatePayment(
    {
      amount: PRICE_USDG,
      recipient: (process.env.DEMO_MERCHANT_WALLET || "").toLowerCase(),
      network: NETWORK,
      challengeStore: defaultChallengeStore,
      replayStore: defaultReplayStore,
      realm: "verge",
      resourceName: "Verge Live Demo",
      resourceDescription: "Real USDG payment demo endpoint on Robinhood Chain",
    },
    proof.tx,
    proof.nonce,
    { url: publicOrigin(req) + "/api/demo" }
  );

  switch (outcome.kind) {
    case "challenge": {
      return new Response(JSON.stringify({
        error: "Payment required",
        code: "PAYMENT_REQUIRED",
        x402Version: 2,
        challenge: outcome.challenge,
        retry: { method: "GET", url: "/api/demo", headers_required: ["payment-signature | x-pay-tx + x-pay-nonce"] },
      }), {
        status: 402,
        headers: { "Content-Type": "application/json", ...outcome.headers },
      });
    }
    case "nonce_required":
      return Response.json({ error: "Payment nonce required", code: "NONCE_REQUIRED" }, { status: 402 });
    case "nonce_invalid":
      return Response.json({ error: "Payment nonce is unknown or expired", code: "NONCE_INVALID" }, { status: 402 });
    case "replayed":
      return Response.json({ error: "Transaction already used", code: "TX_REPLAYED" }, { status: 402 });
    case "invalid":
      return Response.json({ error: "Payment verification failed", code: "TX_NOT_PAID" }, { status: 402 });
    case "error":
      return Response.json({ error: "Payment verifier unavailable", code: "TX_RPC_ERROR", detail: outcome.detail }, { status: 503 });
    case "unlocked":
      if (outcome.payer) void recordSettlement(outcome.payer, { valueUsdg: PRICE_USDG, resource: "demo", txHash: outcome.tx });
      return Response.json({
        ok: true,
        network: NETWORK,
        token: "USDG",
        unlocked_at: new Date().toISOString(),
        payload: { message: "Payment verified on-chain. Premium endpoint unlocked.", tx: proof.tx, nonce: proof.nonce },
      });
  }
}
