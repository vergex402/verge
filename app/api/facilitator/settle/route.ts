// POST /api/facilitator/settle — x402 v2 facilitator settlement (spec §7.2).
// Verifies the on-chain payment, then durably commits: consumes the challenge
// nonce and records the tx in the replay store (Postgres-backed, restart-safe).
// Accepts { x402Version, paymentPayload, paymentRequirements }.

import { NextRequest } from "next/server";
import { settleX402Payment, type X402PaymentPayload, type X402PaymentRequirements } from "@vergex402/core";
import { pgChallengeStore, pgReplayStore } from "@/app/lib/x402-stores";

export const runtime = "nodejs";

interface FacilitatorRequest {
  x402Version?: number;
  paymentPayload?: X402PaymentPayload;
  paymentRequirements?: X402PaymentRequirements;
}

export async function POST(req: NextRequest) {
  let body: FacilitatorRequest;
  try {
    body = (await req.json()) as FacilitatorRequest;
  } catch {
    return Response.json(
      { success: false, errorReason: "invalid_request_body", transaction: "", network: "unknown" },
      { status: 400 }
    );
  }
  if (!body.paymentPayload || !body.paymentRequirements) {
    return Response.json(
      { success: false, errorReason: "paymentPayload and paymentRequirements are required", transaction: "", network: "unknown" },
      { status: 400 }
    );
  }

  const result = await settleX402Payment(
    { challengeStore: pgChallengeStore, replayStore: pgReplayStore, realm: "verge" },
    body.paymentPayload,
    body.paymentRequirements
  );
  return Response.json(result);
}
