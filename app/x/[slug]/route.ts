// GET /x/[slug] — a live, hosted x402 endpoint. Anyone can call this. It returns
// a real HTTP 402 challenge, verifies a real USDG settlement on Robinhood Chain,
// then proxies to a REAL upstream (joke/quote/price API) — not mock data.
// This is what makes the Marketplace a real product instead of a link directory:
// the publisher never has to run their own server.

import { NextRequest } from "next/server";
import { evaluatePayment, type PaymentNetwork } from "@vergex402/core";
import { queryOne, query } from "@/app/lib/db";
import { pgChallengeStore, pgReplayStore } from "@/app/lib/x402-stores";
import { HOSTED_TEMPLATES } from "@/app/lib/hosted-templates";

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

  const tx = req.headers.get("x-pay-tx");
  const nonce = req.headers.get("x-pay-nonce");

  await query(`UPDATE endpoints SET requests_count = requests_count + 1 WHERE id = $1`, [row.id]);

  const outcome = await evaluatePayment(
    { amount: Number(row.priceUsdg), recipient: row.wallet, network: row.network as PaymentNetwork, challengeStore: pgChallengeStore, replayStore: pgReplayStore, realm: "verge" },
    tx,
    nonce
  );

  if (outcome.kind === "challenge") {
    return new Response(JSON.stringify({ error: "Payment required", code: "PAYMENT_REQUIRED", endpoint: row.name, challenge: outcome.challenge, retry: { method: "GET", url: `/x/${slug}`, headers_required: ["x-pay-tx", "x-pay-nonce"] } }), {
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
    return Response.json({ ok: true, endpoint: row.name, settled: true, tx, nonce, data }, { headers: { "X-Settlement-Verified": "true" } });
  } catch (error) {
    return Response.json({ error: "Upstream data source unavailable", detail: String(error instanceof Error ? error.message : error) }, { status: 502 });
  }
}
