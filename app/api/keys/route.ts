import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { query, queryOne } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET() {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const keys = await query(`SELECT id, created_at as "createdAt", last_four as "lastFour", revoked_at as "revokedAt",
    quota_limit as "quotaLimit", usage_count as "usageCount", usage_date as "usageDate", last_used_at as "lastUsedAt"
    FROM api_keys WHERE wallet = $1 ORDER BY created_at DESC`, [address]);
  return Response.json({ keys });
}

export async function POST(_req: NextRequest) {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const raw = `vg_live_${randomBytes(24).toString("base64url")}`;
  const id = `key_${randomBytes(8).toString("hex")}`;
  await query(
    "INSERT INTO api_keys(id, wallet, key_hash, last_four, created_at) VALUES ($1, $2, $3, $4, $5)",
    [id, address, createHash("sha256").update(raw).digest("hex"), raw.slice(-4), new Date().toISOString()]
  );
  return Response.json({ key: raw, id, warning: "Copy this key now. It will not be shown again." }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Key id required" }, { status: 400 });
  const result = await queryOne(
    "UPDATE api_keys SET revoked_at = $1 WHERE id = $2 AND wallet = $3 AND revoked_at IS NULL RETURNING id",
    [new Date().toISOString(), id, address]
  );
  if (!result) return Response.json({ error: "Key not found" }, { status: 404 });
  return Response.json({ ok: true });
}
