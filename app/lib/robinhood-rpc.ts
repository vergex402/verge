// Robinhood Chain RPC client with automatic fallback across multiple endpoints.
// Alchemy (if ALCHEMY_API_KEY is set) is tried first as a dedicated, rate-limit-friendly
// provider; public endpoints remain as fallback so a single provider having a bad day
// never takes payment verification down with it.

const DEFAULT_ENDPOINTS = [
  "https://rpc.mainnet.chain.robinhood.com",
  "https://robinhood.drpc.org",
  "https://robinhood-rpc.publicnode.com",
  "https://robinhood.rpc.blxrbdn.com",
];

export function robinhoodRpcEndpoints(): string[] {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const alchemy = alchemyKey ? [`https://robinhood-mainnet.g.alchemy.com/v2/${alchemyKey}`] : [];
  const custom = process.env.ROBINHOOD_RPC_URL;
  const extra = (process.env.ROBINHOOD_RPC_FALLBACK_URLS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const ordered = [...(custom ? [custom] : []), ...alchemy, ...extra, ...DEFAULT_ENDPOINTS];
  return Array.from(new Set(ordered));
}

/** Call a JSON-RPC method against Robinhood Chain, trying each endpoint in order until one succeeds. */
export async function robinhoodRpc(method: string, params: unknown[]): Promise<unknown> {
  const endpoints = robinhoodRpcEndpoints();
  let lastError: unknown;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Verge-Gateway/1.0" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`RPC ${response.status} from ${url}`);
      const body = await response.json();
      if (body.error) throw new Error(body.error.message || `RPC error from ${url}`);
      return body.result;
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  throw new Error(`All Robinhood Chain RPC endpoints failed: ${String(lastError)}`);
}
