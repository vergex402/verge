import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { query, queryOne, audit, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET(req: NextRequest) {
  if (!(await allowRateLimit(`keys-list:${requestIp(req)}`, 60))) return rateLimitResponse();
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const keys = await query(`SELECT id, created_at as "createdAt", last_four as "lastFour", revoked_at as "revokedAt",
    quota_limit as "quotaLimit", usage_count as "usageCount", usage_date as "usageDate", last_used_at as "lastUsedAt",
    label, expires_at as "expiresAt"
    FROM api_keys WHERE wallet = $1 ORDER BY created_at DESC`, [address]);
  return Response.json({ keys });
}

export async function POST(_req: NextRequest) {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  let body: { label?: string; expiresIn?: string } = {};
  try { body = await _req.json().catch(() => ({})); } catch { body = {}; }
  const raw = `vg_live_${randomBytes(24).toString("base64url")}`;
  const id = `key_${randomBytes(8).toString("hex")}`;
  const label = typeof body.label === "string" ? body.label.slice(0, 60).trim() : "";
  const expiresAt = body.expiresIn && Number(body.expiresIn) > 0
    ? new Date(Date.now() + Number(body.expiresIn) * 1000).toISOString()
    : null;
  await query(
    "INSERT INTO api_keys(id, wallet, key_hash, last_four, label, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [id, address, createHash("sha256").update(raw).digest("hex"), raw.slice(-4), label, expiresAt, new Date().toISOString()]
  );
  await audit("api_key.created", address, id, { lastFour: raw.slice(-4), quotaLimit: 1000, label, expiresAt });
  return Response.json({ key: raw, id, label, expiresAt, warning: "Copy this key now. It will not be shown again." }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await allowRateLimit(`keys-revoke:${requestIp(req)}`, 30))) return rateLimitResponse();
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Key id required" }, { status: 400 });
  const result = await queryOne(
    "UPDATE api_keys SET revoked_at = $1 WHERE id = $2 AND wallet = $3 AND revoked_at IS NULL RETURNING id",
    [new Date().toISOString(), id, address]
  );
  if (!result) return Response.json({ error: "Key not found" }, { status: 404 });
  await audit("api_key.revoked", address, id);
  return Response.json({ ok: true });
}
