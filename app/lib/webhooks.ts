// webhooks.ts — fire HMAC-signed HTTP callbacks to developer-registered endpoints.
// Events: payment.settled, endpoint.called.
// Signed with sha256 HMAC of JSON body using the per-webhook secret.
// Non-blocking: each fire is void — failures update fail_count but never throw.

import { createHmac } from "node:crypto";
import { query } from "@/app/lib/db";

export type WebhookEvent = "payment.settled" | "endpoint.called";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

/** Fire all registered webhooks for a wallet that match the event. Non-blocking. */
export async function fireWebhooks(wallet: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  let hooks: WebhookRow[];
  try {
    hooks = await query<WebhookRow>(
      `SELECT id, url, secret, events FROM webhooks WHERE wallet = $1 AND enabled = TRUE`,
      [wallet]
    );
  } catch {
    return;
  }

  const relevant = hooks.filter((h) => h.events.includes(event));
  if (relevant.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(relevant.map((hook) => fireOne(hook, body)));
}

async function fireOne(hook: WebhookRow, body: string): Promise<void> {
  const sig = createHmac("sha256", hook.secret).update(body).digest("hex");
  const now = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let status = 0;
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Verge-Signature": `sha256=${sig}`,
        "X-Verge-Event": JSON.parse(body).event,
        "User-Agent": "Verge-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });
    status = res.status;
  } catch {
    status = 0;
  } finally {
    clearTimeout(timeout);
  }

  const success = status >= 200 && status < 300;
  try {
    await query(
      `UPDATE webhooks SET last_fired_at = $1, last_status = $2,
        fire_count = fire_count + 1,
        fail_count = fail_count + $3
       WHERE id = $4`,
      [now, status, success ? 0 : 1, hook.id]
    );
  } catch { /* best-effort */ }
}
