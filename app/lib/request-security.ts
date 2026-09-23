import type { NextRequest } from "next/server";

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown").slice(0, 100);
}

export function rateLimitResponse() {
  return Response.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
}
