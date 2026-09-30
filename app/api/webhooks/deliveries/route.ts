import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { query } from "@/app/lib/db";
import { redactWebhookDelivery } from "@/app/lib/webhook-deliveries";
import { replayWebhookDelivery } from "@/app/lib/webhooks";

export const runtime = "nodejs";
async function owner() { const jar = await cookies(); return sessionAddress(jar.get("verge_session")?.value); }

export async function GET() {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const rows = await query<{ id: number; webhook_id: string; url: string; status: number; attempts: number }>(`SELECT d.id, d.webhook_id, w.url, d.status, d.attempts FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id WHERE d.wallet = $1 AND w.wallet = $1 ORDER BY d.created_at DESC LIMIT 100`, [wallet]);
  return Response.json({ deliveries: rows.map(redactWebhookDelivery) });
}

export async function POST(req: NextRequest) {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  let body: { id?: unknown }; try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Valid delivery id required" }, { status: 400 });
  if (!(await replayWebhookDelivery(wallet, id))) return Response.json({ error: "Delivery not found" }, { status: 404 });
  return Response.json({ ok: true });
}
