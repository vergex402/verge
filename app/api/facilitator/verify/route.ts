// POST /api/facilitator/verify — x402 v2 facilitator verification (spec §7.1).
// Read-only: validates the settlement transaction against the chain without
// committing any state. Accepts { x402Version, paymentPayload, paymentRequirements }.

import { NextRequest } from "next/server";
import { verifyX402Payment, type X402PaymentPayload, type X402PaymentRequirements } from "@vergex402/core";

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
    return Response.json({ isValid: false, invalidReason: "invalid_request_body" }, { status: 400 });
  }
  if (!body.paymentPayload || !body.paymentRequirements) {
    return Response.json({ isValid: false, invalidReason: "paymentPayload and paymentRequirements are required" }, { status: 400 });
  }

  const result = await verifyX402Payment({}, body.paymentPayload, body.paymentRequirements);
  return Response.json(result);
}
