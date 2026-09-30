// HMAC-signed webhook delivery with bounded retries and no queued background work.
import { createHmac } from "node:crypto";
import { query } from "@/app/lib/db";
import { assertPublicHttpUrl, fetchPublicHttpUrl } from "@/app/lib/request-security";

export type WebhookEvent = "payment.settled" | "endpoint.called";
export interface WebhookPayload { event: WebhookEvent; timestamp: string; data: Record<string, unknown>; }
interface WebhookRow { id: string; wallet: string; url: string; secret: string; events: string[]; }

const MAX_ATTEMPTS = 3;
const MAX_DESTINATION_CONCURRENCY = 2;
const MAX_ACTIVE_DELIVERIES = 50;
let activeDeliveries = 0;
const activeDestinations = new Map<string, number>();
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function acquireDestination(destination: string): boolean {
  const active = activeDestinations.get(destination) ?? 0;
  if (activeDeliveries >= MAX_ACTIVE_DELIVERIES || active >= MAX_DESTINATION_CONCURRENCY) return false;
  activeDeliveries++;
  activeDestinations.set(destination, active + 1);
  return true;
}
function releaseDestination(destination: string): void {
  activeDeliveries--;
  const active = (activeDestinations.get(destination) ?? 1) - 1;
  if (active > 0) activeDestinations.set(destination, active); else activeDestinations.delete(destination);
}

/** Fire all matching webhooks. Per-hook work is bounded to three attempts. */
export async function fireWebhooks(wallet: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  let hooks: WebhookRow[];
  try { hooks = await query<WebhookRow>(`SELECT id, wallet, url, secret, events FROM webhooks WHERE wallet = $1 AND enabled = TRUE`, [wallet]); } catch { return; }
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data } satisfies WebhookPayload);
  await Promise.allSettled(hooks.filter((hook) => hook.events.includes(event)).map((hook) => fireOne(hook, body, event)));
}

export async function replayWebhookDelivery(wallet: string, deliveryId: number): Promise<boolean> {
  const row = await query<WebhookRow & { payload: WebhookPayload }>(`SELECT w.id, w.wallet, w.url, w.secret, w.events, d.payload FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id WHERE d.id = $1 AND d.wallet = $2 AND w.wallet = $2`, [deliveryId, wallet]);
  const delivery = row[0];
  if (!delivery) return false;
  const payload = delivery.payload;
  if (payload.event !== "payment.settled" && payload.event !== "endpoint.called") return false;
  await fireOne(delivery, JSON.stringify(payload), payload.event);
  return true;
}

async function fireOne(hook: WebhookRow, body: string, event: WebhookEvent): Promise<void> {
  const delivery = await query<{ id: number }>(`INSERT INTO webhook_deliveries(webhook_id, wallet, event, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id`, [hook.id, hook.wallet, event, body]).catch(() => []);
  const deliveryId = delivery[0]?.id;
  let target;
  try { target = await assertPublicHttpUrl(hook.url); } catch { await recordResult(hook.id, 0, deliveryId, 0); return; }
  const destination = target.origin;
  // Drop excess concurrent deliveries instead of accumulating an unbounded queue.
  if (!acquireDestination(destination)) { await recordResult(hook.id, 0, deliveryId, 0); return; }

  let status = 0;
  let attempts = 0;
  try {
    const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      attempts++;
      // Re-resolve and re-pin for every network attempt; DNS cannot change
      // between validation and the actual socket connection.
      try {
        target = await assertPublicHttpUrl(hook.url);
        const res = await fetchPublicHttpUrl(target, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Verge-Signature": `sha256=${signature}`, "X-Verge-Event": event, "User-Agent": "Verge-Webhook/1.0" },
          body,
          signal: AbortSignal.timeout(8000),
        });
        status = res.status;
        if (status < 500) break; // 2xx and all 4xx are final.
      } catch { status = 0; }
      if (attempt + 1 < MAX_ATTEMPTS) await delay(100 * 2 ** attempt);
    }
  } finally {
    releaseDestination(destination);
  }
  await recordResult(hook.id, status, deliveryId, attempts);
}

async function recordResult(id: string, status: number, deliveryId?: number, attempts = 1): Promise<void> {
  const success = status >= 200 && status < 300;
  try {
    await query(`UPDATE webhooks SET last_fired_at = $1, last_status = $2, fire_count = fire_count + 1, fail_count = fail_count + $3 WHERE id = $4`, [new Date().toISOString(), status, success ? 0 : 1, id]);
    if (deliveryId) await query(`UPDATE webhook_deliveries SET status = $1, attempts = $2, delivered_at = CASE WHEN $3 THEN NOW() ELSE NULL END WHERE id = $4`, [status, attempts, success, deliveryId]);
  } catch { /* best-effort */ }
}
