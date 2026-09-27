// HMAC-signed webhook delivery with bounded retries and no queued background work.
import { createHmac } from "node:crypto";
import { query } from "@/app/lib/db";
import { assertPublicHttpUrl, fetchPublicHttpUrl } from "@/app/lib/request-security";

export type WebhookEvent = "payment.settled" | "endpoint.called";
export interface WebhookPayload { event: WebhookEvent; timestamp: string; data: Record<string, unknown>; }
interface WebhookRow { id: string; url: string; secret: string; events: string[]; }

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
  try { hooks = await query<WebhookRow>(`SELECT id, url, secret, events FROM webhooks WHERE wallet = $1 AND enabled = TRUE`, [wallet]); } catch { return; }
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data } satisfies WebhookPayload);
  await Promise.allSettled(hooks.filter((hook) => hook.events.includes(event)).map((hook) => fireOne(hook, body, event)));
}

async function fireOne(hook: WebhookRow, body: string, event: WebhookEvent): Promise<void> {
  let target;
  try { target = await assertPublicHttpUrl(hook.url); } catch { await recordResult(hook.id, 0); return; }
  const destination = target.origin;
  // Drop excess concurrent deliveries instead of accumulating an unbounded queue.
  if (!acquireDestination(destination)) { await recordResult(hook.id, 0); return; }

  let status = 0;
  try {
    const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
  await recordResult(hook.id, status);
}

async function recordResult(id: string, status: number): Promise<void> {
  const success = status >= 200 && status < 300;
  try {
    await query(`UPDATE webhooks SET last_fired_at = $1, last_status = $2, fire_count = fire_count + 1, fail_count = fail_count + $3 WHERE id = $4`, [new Date().toISOString(), status, success ? 0 : 1, id]);
  } catch { /* best-effort */ }
}
