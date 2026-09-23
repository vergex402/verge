import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { query } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  const rows = await query<{
    endpoints: string; discoveryHits: string; paidCalls: string; settlementVolume: string;
  }>(`SELECT COUNT(*)::text as endpoints, COALESCE(SUM(requests_count),0)::text as "discoveryHits",
      COALESCE(SUM(paid_calls_count),0)::text as "paidCalls", COALESCE(SUM(settlement_volume),0)::text as "settlementVolume"
      FROM endpoints WHERE wallet = $1 AND revoked_at IS NULL`, [wallet]);
  const metrics = rows[0] || { endpoints: "0", discoveryHits: "0", paidCalls: "0", settlementVolume: "0" };
  return Response.json({ wallet, metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, Number(v)])) });
}
