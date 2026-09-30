// GET /api/feed — Server-Sent Events stream of live x402 settlements.
// Clients receive a "settlement" event whenever any payment settles through Verge.
// Public endpoint — no auth required (no payer PII exposed).
//
// Event shape:
//   event: settlement
//   data: { id, amountUsdg, network, endpointName, truncatedPayer, settledAt }
//
// Usage:
//   const es = new EventSource("https://vergesnowy.com/api/feed");
//   es.addEventListener("settlement", e => console.log(JSON.parse(e.data)));

import { NextRequest } from "next/server";
import { allowRateLimit, query } from "@/app/lib/db";
import { type FeedEvent, toFeedEvents } from "@/app/lib/feed-events";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";
// Disable Next.js response buffering so SSE streams immediately
export const dynamic = "force-dynamic";

// In-memory broadcast bus — works per-worker process
// In multi-process environments, use Redis pub/sub instead
const subscribers = new Set<(event: FeedEvent) => void>();
const MAX_SSE_CONNECTIONS = 100;

/** Called by the facilitator settle route to broadcast to all SSE clients. */
export function broadcastSettlement(event: FeedEvent) {
  for (const cb of subscribers) {
    try { cb(event); } catch { /* client disconnected */ }
  }
}

export async function GET(req: NextRequest) {
  if (subscribers.size >= MAX_SSE_CONNECTIONS) {
    return Response.json({ error: "Live feed at capacity; retry shortly" }, { status: 503, headers: { "Retry-After": "15" } });
  }
  if (!(await allowRateLimit(`feed:${requestIp(req)}`, 20))) return rateLimitResponse();

  const history = toFeedEvents(await query<{
    id: number;
    public_id: string | null;
    amount_usdg: number;
    payment_network: string | null;
    endpoint_name: string | null;
    payer_address: string | null;
    settled_at: string;
  }>(`SELECT p.id, p.public_id, p.amount_usdg, e.payment_network, e.name AS endpoint_name, p.payer_address, p.settled_at
      FROM payments_log p
      LEFT JOIN endpoints e ON e.id = p.endpoint_id
      ORDER BY p.settled_at DESC
      LIMIT 25`));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send heartbeat comment every 25s to keep connection alive
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let poll: ReturnType<typeof setInterval> | null = null;
      let lastSeenId = Math.max(0, ...history.map((event) => Number(event.id) || 0));

      const send = (event: FeedEvent) => {
        try {
          const payload = `event: settlement\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        subscribers.delete(send);
        if (heartbeat) clearInterval(heartbeat);
        if (poll) clearInterval(poll);
      };

      subscribers.add(send);
      controller.enqueue(encoder.encode(`event: history\ndata: ${JSON.stringify(history)}\n\n`));
      // Poll the durable Postgres log so another service instance's settlement
      // reaches this stream even when it has a different in-memory subscriber set.
      poll = setInterval(() => { void (async () => {
        try {
          const rows = await query<{ id: number; public_id: string | null; amount_usdg: number; payment_network: string | null; endpoint_name: string | null; payer_address: string | null; settled_at: string }>(`SELECT p.id, p.public_id, p.amount_usdg, e.payment_network, e.name AS endpoint_name, p.payer_address, p.settled_at FROM payments_log p LEFT JOIN endpoints e ON e.id = p.endpoint_id WHERE p.id > $1 ORDER BY p.id ASC LIMIT 25`, [lastSeenId]);
          for (const event of toFeedEvents(rows)) { lastSeenId = Math.max(lastSeenId, Number(event.id)); send(event); }
        } catch { /* a later poll recovers from a transient database error */ }
      })(); }, 3000);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 25_000);

      // Send initial "connected" event with current stats
      const connected = `event: connected\ndata: ${JSON.stringify({ listeners: subscribers.size, ts: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(connected));

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "access-control-allow-origin": "*",
    },
  });
}
