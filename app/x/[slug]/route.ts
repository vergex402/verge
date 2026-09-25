// GET /x/[slug] — a live, hosted x402 endpoint. Anyone can call this. It returns
// a real HTTP 402 challenge, verifies a real USDG settlement on Robinhood Chain,
// then proxies to a REAL upstream (joke/quote/price API) — not mock data.
// This is what makes the Marketplace a real product instead of a link directory:
// the publisher never has to run their own server.

import { NextRequest } from "next/server";
import { decodePaymentSignature, evaluatePayment, extractProof, type PaymentNetwork } from "@vergex402/core";
import { queryOne, query } from "@/app/lib/db";
import { pgChallengeStore, pgReplayStore } from "@/app/lib/x402-stores";
import { HOSTED_TEMPLATES } from "@/app/lib/hosted-templates";
import { recordSettlement } from "@/app/lib/reputation";
import { fireWebhooks } from "@/app/lib/webhooks";

function publicOrigin(req: NextRequest): string {
  const xfHost = req.headers.get("x-forwarded-host");
  const xfProto = req.headers.get("x-forwarded-proto") || "https";
  if (xfHost) return `${xfProto.split(",")[0].trim()}://${xfHost.split(",")[0].trim()}`;
  return new URL(req.url).origin;
}

export const runtime = "nodejs";

interface EndpointRow {
  id: string;
  wallet: string;
  name: string;
  priceUsdg: number;
  network: string;
  hostedTemplate: string | null;
  revokedAt: string | null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await queryOne<EndpointRow>(
    `SELECT id, wallet, name, price_usdg as "priceUsdg", payment_network as network, hosted_template as "hostedTemplate", revoked_at as "revokedAt"
     FROM endpoints WHERE hosted_slug = $1`,
    [slug]
  );
  if (!row || row.revokedAt) return Response.json({ error: "Hosted endpoint not found" }, { status: 404 });
  const template = row.hostedTemplate ? HOSTED_TEMPLATES[row.hostedTemplate] : null;
  if (!template) return Response.json({ error: "Hosted endpoint misconfigured" }, { status: 500 });

  // Dual dialect: standard x402 v2 PAYMENT-SIGNATURE, or legacy X-Pay-* headers.
  const sig = req.headers.get("payment-signature");
  const payload = decodePaymentSignature(sig || "");
  const proof = extractProof(payload, req.headers.get("x-pay-tx"), req.headers.get("x-pay-nonce"));
  const tx = proof.tx;
  const nonce = proof.nonce;

  await query(`UPDATE endpoints SET requests_count = requests_count + 1 WHERE id = $1`, [row.id]);

  const outcome = await evaluatePayment(
    { amount: Number(row.priceUsdg), recipient: row.wallet, network: row.network as PaymentNetwork, challengeStore: pgChallengeStore, replayStore: pgReplayStore, realm: "verge", resourceName: row.name.slice(0, 32) },
    tx,
    nonce,
    { url: publicOrigin(req) + `/x/${slug}` }
  );

  if (outcome.kind === "challenge") {
    return new Response(JSON.stringify({ error: "Payment required", code: "PAYMENT_REQUIRED", x402Version: 2, endpoint: row.name, challenge: outcome.challenge, retry: { method: "GET", url: `/x/${slug}`, headers_required: ["payment-signature | x-pay-tx + x-pay-nonce"] } }), {
      status: 402, headers: { "Content-Type": "application/json", ...outcome.headers },
    });
  }
  if (outcome.kind === "nonce_required") return Response.json({ error: "Payment nonce required", code: "NONCE_REQUIRED" }, { status: 402 });
  if (outcome.kind === "nonce_invalid") return Response.json({ error: "Nonce invalid or expired — request a fresh challenge", code: "NONCE_INVALID" }, { status: 402 });
  if (outcome.kind === "replayed") return Response.json({ error: "Transaction already used", code: "TX_REPLAYED" }, { status: 402 });
  if (outcome.kind === "invalid") return Response.json({ error: "Payment verification failed", code: "TX_NOT_PAID" }, { status: 402 });
  if (outcome.kind === "error") return Response.json({ error: "Payment verifier unavailable", code: "TX_RPC_ERROR", detail: outcome.detail }, { status: 503 });

  // outcome.kind === "unlocked" — settlement verified onchain. Serve the real upstream payload.
  try {
    const data = await template.fetchData();
    await query(`UPDATE endpoints SET paid_calls_count = paid_calls_count + 1, settlement_volume = settlement_volume + $2 WHERE id = $1`, [row.id, row.priceUsdg]);
    await query(`INSERT INTO payments_log(wallet, payer_address, amount_usdg, endpoint_id) VALUES ($1,$2,$3,$4)`, [row.wallet, outcome.payer || null, row.priceUsdg, row.id]);
    if (outcome.payer) void recordSettlement(outcome.payer, { valueUsdg: row.priceUsdg, resource: row.hostedTemplate || row.name, txHash: outcome.tx });
    void fireWebhooks(row.wallet, "payment.settled", {
      type: "endpoint", endpointId: row.id, slug, name: row.name,
      amount: row.priceUsdg, network: row.network, payer: outcome.payer, tx: outcome.tx,
    });
    void fireWebhooks(row.wallet, "endpoint.called", {
      endpointId: row.id, slug, name: row.name, paid: true, payer: outcome.payer,
    });
    return Response.json({ ok: true, endpoint: row.name, settled: true, tx, nonce, data }, { headers: { "X-Settlement-Verified": "true" } });
  } catch (error) {
    return Response.json({ error: "Upstream data source unavailable", detail: String(error instanceof Error ? error.message : error) }, { status: 502 });
  }
}
