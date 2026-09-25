// GET /api/invoice/[id] — public invoice lookup (for /pay/[id] page and agents).
// Returns invoice metadata but NOT the wallet address.
// POST /api/invoice/[id]/settle — called by /pay/[id] after on-chain payment.

import { NextRequest } from "next/server";
import { queryOne, query, allowRateLimit } from "@/app/lib/db";
import { fireWebhooks } from "@/app/lib/webhooks";
import { evaluatePayment, extractProof, decodePaymentSignature, type PaymentNetwork } from "@vergex402/core";
import { pgChallengeStore, pgReplayStore } from "@/app/lib/x402-stores";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

interface InvoiceRow {
  id: string;
  wallet: string;
  description: string;
  amountUsdg: number;
  network: string;
  status: string;
  paidAt: string | null;
  payerAddress: string | null;
  txHash: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await queryOne<InvoiceRow>(
    `SELECT id, description, amount_usdg as "amountUsdg", network, status,
      paid_at as "paidAt", payer_address as "payerAddress",
      expires_at as "expiresAt", created_at as "createdAt"
     FROM invoices WHERE id = $1`,
    [id]
  );
  if (!inv) return Response.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.expiresAt && inv.expiresAt < new Date().toISOString() && inv.status === "pending") {
    await query(`UPDATE invoices SET status = 'expired' WHERE id = $1 AND status = 'pending'`, [id]);
    return Response.json({ error: "Invoice expired" }, { status: 410 });
  }
  // Omit wallet from public response
  return Response.json({ id: inv.id, description: inv.description, amountUsdg: inv.amountUsdg,
    network: inv.network, status: inv.status, paidAt: inv.paidAt, expiresAt: inv.expiresAt,
    createdAt: inv.createdAt });
}

// POST: attempt to settle the invoice via x402 payment proof in headers.
// The /pay/[id] page sends payment-signature after the wallet has signed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowRateLimit(`invoice-settle:${requestIp(req)}`, 20))) return rateLimitResponse();
  const { id } = await params;
  const inv = await queryOne<InvoiceRow>(
    `SELECT id, wallet, amount_usdg as "amountUsdg", network, status, expires_at as "expiresAt"
     FROM invoices WHERE id = $1`,
    [id]
  );
  if (!inv) return Response.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status !== "pending") return Response.json({ error: `Invoice already ${inv.status}` }, { status: 409 });
  if (inv.expiresAt && inv.expiresAt < new Date().toISOString()) {
    await query(`UPDATE invoices SET status = 'expired' WHERE id = $1`, [id]);
    return Response.json({ error: "Invoice expired" }, { status: 410 });
  }

  // Accept x402 payment proof via header (PAYMENT-SIGNATURE) or JSON body {tx, nonce}
  const sig = req.headers.get("payment-signature");
  let tx: string | undefined, nonce: string | undefined;

  if (sig) {
    const payload = decodePaymentSignature(sig);
    const proof = extractProof(payload, null, null);
    tx = proof.tx ?? undefined; nonce = proof.nonce ?? undefined;
  } else {
    try {
      const body = await req.json();
      tx = body.tx; nonce = body.nonce;
    } catch { /* no body ok */ }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.com";

  const outcome = await evaluatePayment(
    { amount: inv.amountUsdg, recipient: inv.wallet, network: inv.network as PaymentNetwork,
      challengeStore: pgChallengeStore, replayStore: pgReplayStore, realm: "verge", resourceName: `Invoice ${id}` },
    tx, nonce, { url: `${siteUrl}/pay/${id}` }
  );

  if (outcome.kind === "challenge") {
    return new Response(JSON.stringify({ error: "Payment required", challenge: outcome.challenge }), {
      status: 402, headers: { "Content-Type": "application/json", ...outcome.headers }
    });
  }
  if (outcome.kind !== "unlocked") {
    return Response.json({ error: "Payment verification failed", code: outcome.kind }, { status: 402 });
  }

  const now = new Date().toISOString();
  await query(
    `UPDATE invoices SET status = 'paid', paid_at = $1, payer_address = $2, tx_hash = $3 WHERE id = $4 AND status = 'pending'`,
    [now, outcome.payer || null, outcome.tx || null, id]
  );
  await query(`INSERT INTO payments_log(wallet, payer_address, amount_usdg, endpoint_id) VALUES ($1,$2,$3,$4)`,
    [inv.wallet, outcome.payer || null, inv.amountUsdg, id]);

  void fireWebhooks(inv.wallet, "payment.settled", {
    type: "invoice", invoiceId: id, amount: inv.amountUsdg, network: inv.network,
    payer: outcome.payer, tx: outcome.tx, paidAt: now,
  });

  return Response.json({ ok: true, status: "paid", paidAt: now, tx: outcome.tx, payer: outcome.payer });
}
