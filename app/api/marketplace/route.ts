import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { verifyEndpointUrl } from "@/app/lib/endpoint-health";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET() {
  const endpoints = await query(`SELECT id, name, url, price_usdg as price, description, wallet,
    health_status as "healthStatus", payment_required as "paymentRequired", checked_at as "checkedAt",
    created_at as "createdAt" FROM endpoints WHERE revoked_at IS NULL AND health_status IN (200, 401, 402)
    ORDER BY created_at DESC LIMIT 100`);
  return Response.json({ network: { chainId: 4663, asset: "USDG" }, endpoints }, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(req: NextRequest) {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const { name, url, price, description = "" } = await req.json();
    const numericPrice = Number(price);
    if (typeof name !== "string" || name.trim().length < 2 || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      return Response.json({ error: "Name and positive USDG price are required" }, { status: 400 });
    }
    const health = await verifyEndpointUrl(url);
    const id = `ep_${randomBytes(8).toString("hex")}`;
    const checkedAt = new Date().toISOString();
    await query(`INSERT INTO endpoints(id, wallet, name, url, price_usdg, description, health_status, payment_required, checked_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, wallet, name.trim(), health.url, numericPrice, String(description).slice(0, 280), health.status, Number(health.paymentRequired), checkedAt, checkedAt]);
    return Response.json({ id, name: name.trim(), url: health.url, price: numericPrice, healthStatus: health.status, paymentRequired: health.paymentRequired, checkedAt }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid marketplace listing" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Listing id required" }, { status: 400 });
  const result = await queryOne(
    "UPDATE endpoints SET revoked_at = $1 WHERE id = $2 AND wallet = $3 AND revoked_at IS NULL RETURNING id",
    [new Date().toISOString(), id, wallet]
  );
  if (!result) return Response.json({ error: "Listing not found" }, { status: 404 });
  return Response.json({ ok: true });
}
