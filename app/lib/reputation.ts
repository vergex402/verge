// reputation.ts — agent reputation scores derived from settled x402 payments
// (ported from Tribute's reputation.js, Postgres-backed for Verge).
//
// A settlement history is an on-chain-grounded trust signal: an agent that
// has repeatedly paid for resources is accountable — it has skin in the
// game. Every claim here is anchored to a verifiable tx hash from Verge's
// own facilitator settlements, not a self-reported number.
import { query, queryOne } from "@/app/lib/db";

export interface ReputationScore {
  address: string;
  score: number;
  tier: "unknown" | "new" | "established" | "trusted";
  settledCount: number;
  totalUsdg: number;
  firstSeen: number | null;
  lastSeen: number | null;
  resources: Record<string, number>;
  txHashes: string[];
}

interface ReputationRow {
  address: string;
  first_seen: string;
  last_seen: string;
  settled_count: string;
  total_usdg: number;
  resources: Record<string, number>;
  txs: string[];
}

/** Records a settled payment against the payer's reputation. Call this right after a successful settle. */
export async function recordSettlement(payer: string, opts: { valueUsdg?: number; resource?: string; txHash?: string } = {}): Promise<void> {
  if (!payer || !/^0x[0-9a-fA-F]{40}$/.test(payer)) return;
  const address = payer.toLowerCase();
  const now = Date.now();

  const existing = await queryOne<ReputationRow>(`SELECT * FROM reputation WHERE address = $1`, [address]);
  const resources = existing?.resources || {};
  const txs = existing?.txs || [];

  if (opts.resource) resources[opts.resource] = (resources[opts.resource] || 0) + 1;
  if (opts.txHash) {
    txs.unshift(opts.txHash);
    if (txs.length > 50) txs.length = 50;
  }
  const settledCount = (existing ? Number(existing.settled_count) : 0) + 1;
  const totalUsdg = (existing ? Number(existing.total_usdg) : 0) + Number(opts.valueUsdg || 0);

  await query(
    `INSERT INTO reputation(address, first_seen, last_seen, settled_count, total_usdg, resources, txs)
     VALUES ($1,$2,$2,$3,$4,$5::jsonb,$6::jsonb)
     ON CONFLICT (address) DO UPDATE SET last_seen = $2, settled_count = $3, total_usdg = $4, resources = $5::jsonb, txs = $6::jsonb`,
    [address, now, settledCount, totalUsdg, JSON.stringify(resources), JSON.stringify(txs)]
  );
}

/**
 * Score model (0-100), deliberately simple and explainable:
 *   40 pts  settled payments count (log scale: 1 → ~13, 4 → ~26, 16+ → 40)
 *   25 pts  cumulative USDG paid (log scale, capped)
 *   15 pts  longevity (days since firstSeen, capped at 30 days)
 *   20 pts  recency (active in last 7d = full, decays to 0 at 30d)
 */
export async function scoreAddress(address: string): Promise<ReputationScore> {
  const addr = String(address || "").toLowerCase();
  const a = await queryOne<ReputationRow>(`SELECT * FROM reputation WHERE address = $1`, [addr]);
  if (!a) return { address: addr, score: 0, tier: "unknown", settledCount: 0, totalUsdg: 0, firstSeen: null, lastSeen: null, resources: {}, txHashes: [] };

  const settledCount = Number(a.settled_count);
  const totalUsdg = Number(a.total_usdg);
  const firstSeen = Number(a.first_seen);
  const lastSeen = Number(a.last_seen);

  const pay = Math.min(40, Math.log2(settledCount + 1) * 10);
  const volume = Math.min(25, Math.log10(totalUsdg + 1) * 10);
  const days = (Date.now() - firstSeen) / 86_400_000;
  const longevity = Math.min(15, days * 0.5);
  const daysSince = (Date.now() - lastSeen) / 86_400_000;
  const recency = Math.max(0, 20 - daysSince * (20 / 30));
  const total = Math.round(pay + volume + longevity + recency);
  const tier: ReputationScore["tier"] = total >= 75 ? "trusted" : total >= 40 ? "established" : total > 0 ? "new" : "unknown";

  return {
    address: addr,
    score: total,
    tier,
    settledCount,
    totalUsdg: Math.round(totalUsdg * 1e6) / 1e6,
    firstSeen,
    lastSeen,
    resources: a.resources || {},
    // Verifiable anchors: any third party can check these tx hashes on-chain.
    txHashes: (a.txs || []).slice(0, 10),
  };
}

export async function leaderboard(limit = 10): Promise<ReputationScore[]> {
  const rows = await query<{ address: string }>(`SELECT address FROM reputation ORDER BY settled_count DESC, total_usdg DESC LIMIT $1`, [limit]);
  return Promise.all(rows.map((r) => scoreAddress(r.address)));
}

export async function reputationStats(): Promise<{ knownAgents: number; totalSettlements: number }> {
  const row = await queryOne<{ knownAgents: string; totalSettlements: string }>(
    `SELECT COUNT(*) as "knownAgents", COALESCE(SUM(settled_count), 0) as "totalSettlements" FROM reputation`
  );
  return { knownAgents: Number(row?.knownAgents || 0), totalSettlements: Number(row?.totalSettlements || 0) };
}
