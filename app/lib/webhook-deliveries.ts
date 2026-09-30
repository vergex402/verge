type Delivery = { id: number; webhook_id: string; url: string; status: number; attempts: number; error?: string | null };

/** Public-to-owner operational view; deliberately excludes payloads, secrets, paths and provider errors. */
export function redactWebhookDelivery(row: Delivery) {
  let destination = "invalid destination";
  try { const url = new URL(row.url); destination = url.origin; } catch { /* stored historical malformed URL */ }
  const success = row.status >= 200 && row.status < 300;
  return { id: Number(row.id), webhookId: row.webhook_id, destination, status: Number(row.status || 0), attempts: Number(row.attempts || 0), outcome: success ? "delivered" : "failed" };
}
