import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { query, queryOne, audit, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { verifyEndpointUrl } from "@/app/lib/endpoint-health";
import { getRail, type PaymentNetwork } from "@vergex402/core";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET() {
  const endpoints = await query(`SELECT id, name, url, price_usdg as price, description, wallet,
    health_status as "healthStatus", payment_required as "paymentRequired", checked_at as "checkedAt",
    payment_network as network, payment_asset as asset, payment_chain_id as "chainId",
    requests_count as "requestsCount", paid_calls_count as "paidCallsCount", settlement_volume as "settlementVolume",
    created_at as "createdAt" FROM endpoints WHERE revoked_at IS NULL AND health_status IN (200, 401, 402)
    ORDER BY created_at DESC LIMIT 100`);
  return Response.json({ network: { chainId: 4663, asset: "USDG" }, endpoints }, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`marketplace-publish:${requestIp(req)}`, 10))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const { name, url, price, description = "", network = "robinhood-mainnet" } = await req.json();
    const numericPrice = Number(price);
    if (typeof name !== "string" || name.trim().length < 2 || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return Response.json({ error: "Name and non-negative stablecoin price are required" }, { status: 400 });
    }
    const rail = getRail(network as PaymentNetwork);
    const health = await verifyEndpointUrl(url);
    const id = `ep_${randomBytes(8).toString("hex")}`;
    const checkedAt = new Date().toISOString();
    await query(`INSERT INTO endpoints(id, wallet, name, url, price_usdg, description, health_status, payment_required, checked_at, created_at, payment_network, payment_asset, payment_chain_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, wallet, name.trim(), health.url, numericPrice, String(description).slice(0, 280), health.status, Number(health.paymentRequired), checkedAt, checkedAt, rail.id, rail.asset, rail.chainId]);
    await audit("marketplace.endpoint_published", wallet, id, { network: rail.id, asset: rail.asset, chainId: rail.chainId, healthStatus: health.status });
    return Response.json({ id, name: name.trim(), url: health.url, price: numericPrice, network: rail.id, asset: rail.asset, chainId: rail.chainId, healthStatus: health.status, paymentRequired: health.paymentRequired, checkedAt }, { status: 201 });
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
