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
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";
// Disable Next.js response buffering so SSE streams immediately
export const dynamic = "force-dynamic";

// In-memory broadcast bus — works per-worker process
// In multi-process environments, use Redis pub/sub instead
type FeedEvent = {
  id: string;
  amountUsdg: number;
  network: string;
  endpointName: string | null;
  truncatedPayer: string | null; // first 6 + last 4 chars, no full address
  settledAt: string;
};

const subscribers = new Set<(event: FeedEvent) => void>();

/** Called by the facilitator settle route to broadcast to all SSE clients. */
export function broadcastSettlement(event: FeedEvent) {
  for (const cb of subscribers) {
    try { cb(event); } catch { /* client disconnected */ }
  }
}

export async function GET(req: NextRequest) {
  if (!(await allowRateLimit(`feed:${requestIp(req)}`, 20))) return rateLimitResponse();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send heartbeat comment every 25s to keep connection alive
      let heartbeat: ReturnType<typeof setInterval> | null = null;

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
      };

      subscribers.add(send);

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
