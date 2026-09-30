export type EndpointPerformance = { id: string; name: string; requestsCount: number; paidCallsCount: number; settlementVolume: number };

/** Turns persisted endpoint counters into a small, actionable merchant view. */
export function summarizeMerchantAnalytics(rows: EndpointPerformance[]) {
  return rows.map((row) => {
    const requests = Number(row.requestsCount || 0);
    const paidCalls = Number(row.paidCallsCount || 0);
    const conversionRate = requests ? Math.round((paidCalls / requests) * 100) : 0;
    return {
      id: row.id, name: row.name, requests, paidCalls, conversionRate,
      settlementVolume: Number(row.settlementVolume || 0),
      action: requests === 0 ? "Share your endpoint" : conversionRate < 25 ? "Improve payment conversion" : "Keep promoting this endpoint",
    };
  }).sort((a, b) => b.settlementVolume - a.settlementVolume || b.paidCalls - a.paidCalls);
}
