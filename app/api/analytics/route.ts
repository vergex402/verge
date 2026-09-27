import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { query, allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import type { NextRequest } from "next/server";

const CHAINS = [
  { id: "robinhood-mainnet", name: "Robinhood Chain", chainId: 4663, asset: "USDG" },
  { id: "base-mainnet", name: "Base", chainId: 8453, asset: "USDC" },
  { id: "ethereum-mainnet", name: "Ethereum", chainId: 1, asset: "USDC" },
  { id: "arbitrum-mainnet", name: "Arbitrum", chainId: 42161, asset: "USDC" },
  { id: "polygon-mainnet", name: "Polygon", chainId: 137, asset: "USDC" },
  { id: "solana-mainnet", name: "Solana", chainId: 0, asset: "USDC" },
  { id: "sui-mainnet", name: "Sui", chainId: 0, asset: "USDC" },
] as const;

export async function GET(req: NextRequest) {
  const ip = requestIp(req);
  const allowed = await allowRateLimit(`analytics:${ip}`, 30, 60_000);
  if (!allowed) return rateLimitResponse();

  const jar = await cookies();
  const token = jar.get("verge_session")?.value;
  const wallet = await sessionAddress(token);
  if (!wallet) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query Robinhood Chain payments_log for this wallet
  type PayRow = { tx_count: string; total_volume: string };
  const rows = await query<PayRow>(
    `SELECT COUNT(*)::text AS tx_count, COALESCE(SUM(amount_usdg),0)::text AS total_volume
     FROM payments_log
     WHERE wallet = $1`,
    [wallet]
  );

  const row = rows[0];
  const rbhTxCount = parseInt(row?.tx_count ?? "0", 10) || 0;
  const rbhVolume = parseFloat(row?.total_volume ?? "0") || 0;
  const rbhAvg = rbhTxCount > 0 ? rbhVolume / rbhTxCount : 0;

  const chains = CHAINS.map((c) => {
    if (c.id === "robinhood-mainnet") {
      return {
        id: c.id,
        name: c.name,
        chainId: c.chainId,
        asset: c.asset,
        txCount: rbhTxCount,
        volume: rbhVolume,
        avgAmount: rbhAvg,
        status: "live" as const,
      };
    }
    return {
      id: c.id,
      name: c.name,
      chainId: c.chainId,
      asset: c.asset,
      txCount: 0,
      volume: 0,
      avgAmount: 0,
      status: "available" as const,
    };
  });

  const totalVolume = chains.reduce((s, c) => s + c.volume, 0);
  const totalTx = chains.reduce((s, c) => s + c.txCount, 0);
  const dominant = chains.reduce((a, b) => (b.volume > a.volume ? b : a), chains[0]);

  return Response.json({
    wallet,
    chains,
    totalVolume,
    totalTx,
    dominantChain: dominant.id,
  });
}
