// /api/webhooks — CRUD for developer-registered HTTP callbacks.
// GET: list webhooks for authenticated wallet.
// POST: register a new webhook URL + event subscriptions.
// DELETE ?id=: remove a webhook.
// PATCH: update (enable/disable, change URL/events).

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { query, queryOne, audit, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

const VALID_EVENTS = ["payment.settled", "endpoint.called"] as const;

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

export async function GET() {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const hooks = await query(
    `SELECT id, url, events, enabled, created_at as "createdAt",
      last_fired_at as "lastFiredAt", last_status as "lastStatus",
      fire_count as "fireCount", fail_count as "failCount"
     FROM webhooks WHERE wallet = $1 ORDER BY created_at DESC`,
    [wallet]
  );
  return Response.json({ webhooks: hooks });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`webhooks-create:${requestIp(req)}`, 20))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  let body: { url?: unknown; events?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !/^https?:\/\//.test(url)) {
    return Response.json({ error: "Valid http/https URL required" }, { status: 400 });
  }
  // SSRF guard: block private ranges in production
  try {
    const u = new URL(url);
    if (process.env.NODE_ENV === "production" && /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)) {
      return Response.json({ error: "Private URLs not allowed" }, { status: 400 });
    }
  } catch { return Response.json({ error: "Invalid URL" }, { status: 400 }); }

  const events: string[] = Array.isArray(body.events)
    ? (body.events as string[]).filter((e) => VALID_EVENTS.includes(e as typeof VALID_EVENTS[number]))
    : [...VALID_EVENTS];
  if (events.length === 0) return Response.json({ error: "At least one valid event required" }, { status: 400 });

  // Max 5 webhooks per wallet
  const count = await queryOne<{ c: string }>(`SELECT COUNT(*)::text as c FROM webhooks WHERE wallet = $1`, [wallet]);
  if (Number(count?.c ?? 0) >= 5) return Response.json({ error: "Maximum 5 webhooks per wallet" }, { status: 429 });

  const id = `wh_${randomBytes(8).toString("hex")}`;
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO webhooks(id, wallet, url, secret, events, enabled, created_at) VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
    [id, wallet, url, secret, events, now]
  );
  await audit("webhook.created", wallet, id, { url, events });

  return Response.json({ id, url, events, secret, enabled: true, createdAt: now,
    note: "Save the secret — it is shown only once. Use it to verify X-Verge-Signature on incoming payloads." }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const result = await queryOne(`DELETE FROM webhooks WHERE id = $1 AND wallet = $2 RETURNING id`, [id, wallet]);
  if (!result) return Response.json({ error: "Webhook not found" }, { status: 404 });
  await audit("webhook.deleted", wallet, id, {});
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  let body: { enabled?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }
  if (typeof body.enabled !== "boolean") return Response.json({ error: "enabled (boolean) required" }, { status: 400 });
  const result = await queryOne(`UPDATE webhooks SET enabled = $1 WHERE id = $2 AND wallet = $3 RETURNING id`, [body.enabled, id, wallet]);
  if (!result) return Response.json({ error: "Webhook not found" }, { status: 404 });
  return Response.json({ ok: true, enabled: body.enabled });
}
