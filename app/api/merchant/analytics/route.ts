import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { query, queryOne } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  // Core aggregate metrics
  const rows = await query<{
    endpoints: string; discoveryHits: string; paidCalls: string; settlementVolume: string;
  }>(`SELECT COUNT(*)::text as endpoints, COALESCE(SUM(requests_count),0)::text as "discoveryHits",
      COALESCE(SUM(paid_calls_count),0)::text as "paidCalls", COALESCE(SUM(settlement_volume),0)::text as "settlementVolume"
      FROM endpoints WHERE wallet = $1 AND revoked_at IS NULL`, [wallet]);
  const metrics = rows[0] || { endpoints: "0", discoveryHits: "0", paidCalls: "0", settlementVolume: "0" };

  // Daily earnings — last 30 days from payments_log
  const dailyRows = await query<{ day: string; earnings: string; payments: string }>(`
    SELECT
      to_char(settled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
      COALESCE(SUM(amount_usdg), 0)::text as earnings,
      COUNT(*)::text as payments
    FROM payments_log
    WHERE wallet = $1 AND settled_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `, [wallet]);

  // Fill missing days with 0
  const dayMap: Record<string, { earnings: number; payments: number }> = {};
  for (const r of dailyRows) dayMap[r.day] = { earnings: Number(r.earnings), payments: Number(r.payments) };
  const dailyChart: { day: string; earnings: number; payments: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyChart.push({ day: key, earnings: dayMap[key]?.earnings ?? 0, payments: dayMap[key]?.payments ?? 0 });
  }

  // Unique payers (distinct wallet addresses that paid)
  const payerRow = await queryOne<{ uniquePayers: string }>(`
    SELECT COUNT(DISTINCT payer_address)::text as "uniquePayers"
    FROM payments_log WHERE wallet = $1 AND payer_address IS NOT NULL
  `, [wallet]);

  // Today's earnings
  const todayRow = await queryOne<{ todayEarnings: string; todayPayments: string }>(`
    SELECT COALESCE(SUM(amount_usdg),0)::text as "todayEarnings",
           COUNT(*)::text as "todayPayments"
    FROM payments_log
    WHERE wallet = $1 AND settled_at >= date_trunc('day', NOW())
  `, [wallet]);

  // Conversion rate: paid / total_requests across all endpoints
  const convRow = await queryOne<{ totalReqs: string; totalPaid: string }>(`
    SELECT COALESCE(SUM(requests_count),0)::text as "totalReqs",
           COALESCE(SUM(paid_calls_count),0)::text as "totalPaid"
    FROM endpoints WHERE wallet = $1 AND revoked_at IS NULL
  `, [wallet]);
  const totalReqs = Number(convRow?.totalReqs ?? 0);
  const totalPaid = Number(convRow?.totalPaid ?? 0);
  const conversionRate = totalReqs > 0 ? Math.round((totalPaid / totalReqs) * 100) : 0;

  // Avg payment size
  const avgRow = await queryOne<{ avgPayment: string }>(`
    SELECT COALESCE(AVG(amount_usdg), 0)::text as "avgPayment"
    FROM payments_log WHERE wallet = $1
  `, [wallet]);

  return Response.json({
    wallet,
    metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, Number(v)])),
    extended: {
      uniquePayers: Number(payerRow?.uniquePayers ?? 0),
      todayEarnings: Number(todayRow?.todayEarnings ?? 0),
      todayPayments: Number(todayRow?.todayPayments ?? 0),
      conversionRate,
      avgPayment: Number(Number(avgRow?.avgPayment ?? 0).toFixed(6)),
    },
    dailyChart,
  });
}
