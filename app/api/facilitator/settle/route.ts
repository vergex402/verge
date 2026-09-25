// POST /api/facilitator/settle — x402 v2 facilitator settlement (spec §7.2).
// Verifies the on-chain payment, then durably commits: consumes the challenge
// nonce and records the tx in the replay store (Postgres-backed, restart-safe).
// Accepts { x402Version, paymentPayload, paymentRequirements }.

import { NextRequest } from "next/server";
import { settleX402Payment, humanAmount, networkFromCaip2, getRail, type X402PaymentPayload, type X402PaymentRequirements } from "@vergex402/core";
import { pgChallengeStore, pgReplayStore } from "@/app/lib/x402-stores";
import { allowRateLimit } from "@/app/lib/db";
import { query } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import { recordSettlement } from "@/app/lib/reputation";
import { fireWebhooks } from "@/app/lib/webhooks";

export const runtime = "nodejs";

interface FacilitatorRequest {
  x402Version?: number;
  paymentPayload?: X402PaymentPayload;
  paymentRequirements?: X402PaymentRequirements;
}

export async function POST(req: NextRequest) {
  // Settle does on-chain RPC reads + DB writes — cap abuse per IP.
  if (!(await allowRateLimit(`facilitator-settle:${requestIp(req)}`, 60))) return rateLimitResponse();

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
  if (result.success && result.payer) {
    const network = networkFromCaip2(body.paymentRequirements.network);
    const decimals = network ? getRail(network).decimals : 6;
    const amountUsdg = humanAmount(result.amount ?? body.paymentRequirements.amount, decimals);
    const recipient = ((body.paymentRequirements as unknown) as Record<string, unknown>).recipient as string | undefined ?? null;
    if (recipient) void query(`INSERT INTO payments_log(wallet, payer_address, amount_usdg) VALUES ($1,$2,$3)`, [recipient, result.payer, amountUsdg]);
    if (recipient) void fireWebhooks(recipient, "payment.settled", {
      type: "facilitator", payer: result.payer, amount: amountUsdg,
      network: body.paymentRequirements.network, tx: result.transaction,
    });
    void recordSettlement(result.payer, {
      valueUsdg: amountUsdg,
      resource: "facilitator",
      txHash: result.transaction,
    });
  }
  return Response.json(result);
}
