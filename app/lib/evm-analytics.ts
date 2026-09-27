// Multi-chain EVM RPC reader with per-chain fallback endpoints.
// Reads USDC Transfer logs for analytics across EVM rails.
// Publicnode endpoints are reliable without API keys; each chain can be
// overridden via env (e.g. ETHEREUM_RPC_URL) for dedicated providers.

const EVM_CHAIN_RPC: Record<string, string[]> = {
  "ethereum-mainnet": [
    process.env.ETHEREUM_RPC_URL,
    "https://ethereum-rpc.publicnode.com",
  ].filter(Boolean) as string[],
  "base-mainnet": [
    process.env.BASE_RPC_URL,
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
  ].filter(Boolean) as string[],
  "arbitrum-mainnet": [
    process.env.ARBITRUM_RPC_URL,
    "https://arb1.arbitrum.io/rpc",
  ].filter(Boolean) as string[],
  "polygon-mainnet": [
    process.env.POLYGON_RPC_URL,
    "https://polygon-bor-rpc.publicnode.com",
  ].filter(Boolean) as string[],
};

// Canonical USDC contracts per rail
export const EVM_USDC: Record<string, string> = {
  "ethereum-mainnet": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "base-mainnet": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "arbitrum-mainnet": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "polygon-mainnet": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
};

export interface ChainTransfer {
  txHash: string;
  amount: number; // human units
  block: number;
}

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function padAddress(address: string): string {
  return `0x${address.replace(/^0x/i, "").toLowerCase().padStart(64, "0")}`;
}

async function rpcCall(
  url: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Verge-Analytics/1.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`RPC ${res.status} from ${url}`);
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result;
}

async function rpcWithFallback(
  chainId: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const endpoints = EVM_CHAIN_RPC[chainId] ?? [];
  let lastError: unknown;
  for (const url of endpoints) {
    try {
      return await rpcCall(url, method, params);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error(`No RPC endpoints configured for ${chainId}`);
}

/** Scan recent USDC transfers received by `wallet` on the given EVM rail. */
export async function readEvmInboundTransfers(
  chainId: string,
  wallet: string,
  blocksBack = 50_000,
): Promise<ChainTransfer[]> {
  const token = EVM_USDC[chainId];
  if (!token) return [];

  const latestHex = (await rpcWithFallback(chainId, "eth_blockNumber", [])) as string;
  const latest = parseInt(latestHex, 16);
  const fromBlock = Math.max(0, latest - blocksBack);

  const logs = (await rpcWithFallback(chainId, "eth_getLogs", [
    {
      address: token,
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: "latest",
      topics: [TRANSFER_TOPIC, null, padAddress(wallet)],
    },
  ])) as Array<{ transactionHash: string; blockNumber: string; data: string }>;

  return logs.map((log) => ({
    txHash: log.transactionHash,
    block: parseInt(log.blockNumber, 16),
    amount: Number(BigInt(log.data)) / 1e6, // USDC = 6 decimals on all these rails
  }));
}

/** True when the rail has reachable RPC endpoints configured. */
export function evmRailConfigured(chainId: string): boolean {
  return Boolean(EVM_CHAIN_RPC[chainId]?.length);
}
