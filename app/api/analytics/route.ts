import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { query, allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import { readEvmInboundTransfers, evmRailConfigured } from "@/app/lib/evm-analytics";
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

type ChainStatus = "live" | "onchain" | "available";

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

  // Rail 1 — Robinhood Chain: read Verge's own settlement log (source of truth
  // for payments that flowed through the Verge facilitator).
  type PayRow = { tx_count: string; total_volume: string };
  const rows = await query<PayRow>(
    `SELECT COUNT(*)::text AS tx_count, COALESCE(SUM(amount_usdg),0)::text AS total_volume
     FROM payments_log
     WHERE wallet = $1`,
    [wallet]
  );
  const rbhRow = rows[0];
  const rbhTxCount = parseInt(rbhRow?.tx_count ?? "0", 10) || 0;
  const rbhVolume = parseFloat(rbhRow?.total_volume ?? "0") || 0;

  // Rails 2–5 — EVM rails: read real inbound USDC transfers from each chain's
  // public RPC. This is honest on-chain data, scoped to a recent window so the
  // endpoint stays fast without a dedicated indexer.
  const evmResults = await Promise.allSettled(
    ["base-mainnet", "ethereum-mainnet", "arbitrum-mainnet", "polygon-mainnet"].map(
      (id) => readEvmInboundTransfers(id, wallet),
    ),
  );

  const evmByChain = new Map<string, { ok: boolean; transfers: { txHash: string; amount: number }[] }>();
  ["base-mainnet", "ethereum-mainnet", "arbitrum-mainnet", "polygon-mainnet"].forEach((id, i) => {
    const result = evmResults[i];
    if (result.status === "fulfilled") {
      evmByChain.set(id, { ok: true, transfers: result.value });
    } else {
      evmByChain.set(id, { ok: false, transfers: [] });
    }
  });

  const chains = CHAINS.map((c) => {
    if (c.id === "robinhood-mainnet") {
      return {
        id: c.id,
        name: c.name,
        chainId: c.chainId,
        asset: c.asset,
        txCount: rbhTxCount,
        volume: rbhVolume,
        avgAmount: rbhTxCount > 0 ? rbhVolume / rbhTxCount : 0,
        status: "live" as const,
      };
    }

    if (c.id === "solana-mainnet" || c.id === "sui-mainnet") {
      // Non-EVM rails need dedicated readers (SPL balance deltas / Sui GraphQL);
      // kept honest as available rather than faking zero-volume onchain data.
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
    }

    const evm = evmByChain.get(c.id);
    if (!evm?.ok) {
      // RPC unreachable — surface as available, not as fake zeros onchain
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
    }

    const txCount = evm.transfers.length;
    const volume = evm.transfers.reduce((s, t) => s + t.amount, 0);
    return {
      id: c.id,
      name: c.name,
      chainId: c.chainId,
      asset: c.asset,
      txCount,
      volume,
      avgAmount: txCount > 0 ? volume / txCount : 0,
      status: "onchain" as const,
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
    // Which rails returned real on-chain reads vs were unreachable
    onchainRails: chains.filter((c) => c.status === "onchain").map((c) => c.id),
  });
}
