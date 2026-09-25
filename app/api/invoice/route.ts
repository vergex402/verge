// /api/invoice — create single-use shareable payment links (invoices).
// GET: list invoices for authenticated wallet.
// POST: create an invoice. Returns an id + /pay/<id> URL.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { query, queryOne, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import { getRail, type PaymentNetwork } from "@vergex402/core";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET() {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const invoices = await query(
    `SELECT id, description, amount_usdg as "amountUsdg", network, status,
      paid_at as "paidAt", payer_address as "payerAddress", tx_hash as "txHash",
      expires_at as "expiresAt", created_at as "createdAt"
     FROM invoices WHERE wallet = $1 ORDER BY created_at DESC LIMIT 50`,
    [wallet]
  );
  return Response.json({ invoices });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`invoice-create:${requestIp(req)}`, 30))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  let body: { description?: unknown; amount?: unknown; network?: unknown; expiresIn?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const description = typeof body.description === "string" ? body.description.slice(0, 200).trim() : "";
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Positive numeric amount required" }, { status: 400 });

  const network = (typeof body.network === "string" ? body.network : "robinhood-mainnet") as PaymentNetwork;
  try { getRail(network); } catch { return Response.json({ error: "Unsupported network" }, { status: 400 }); }

  // Optional expiry in seconds (default: 7 days)
  const expiresInSec = Number(body.expiresIn) || 7 * 86400;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  const id = `inv_${randomBytes(10).toString("base64url").replace(/[^a-z0-9]/gi, "").slice(0, 14)}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO invoices(id, wallet, description, amount_usdg, network, status, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)`,
    [id, wallet, description, amount, network, expiresAt, now]
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.com";
  return Response.json({
    id,
    url: `${siteUrl}/pay/${id}`,
    description,
    amountUsdg: amount,
    network,
    status: "pending",
    expiresAt,
    createdAt: now,
  }, { status: 201 });
}
