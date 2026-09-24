import { NextRequest } from "next/server";
import { scoreAddress, leaderboard, reputationStats } from "@/app/lib/reputation";

export const runtime = "nodejs";

/**
 * Public reputation lookup — anchored to Verge's own settlement history, no
 * self-reported numbers. GET /api/reputation?address=0x... for one agent, or
 * GET /api/reputation (no query) for the leaderboard + aggregate stats.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (address) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return Response.json({ error: "address must be a valid 0x-prefixed EVM address" }, { status: 400 });
    const score = await scoreAddress(address);
    return Response.json(score, { headers: { "Cache-Control": "public, max-age=30" } });
  }
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));
  const [top, stats] = await Promise.all([leaderboard(limit), reputationStats()]);
  return Response.json({ leaderboard: top, stats }, { headers: { "Cache-Control": "public, max-age=30" } });
}
