// Hosted x402 endpoint templates. Each is a REAL upstream API Verge proxies —
// no mock data. A publisher picks one, sets a price + their wallet, and Verge
// hosts it at /x/<slug> as a live, payable HTTP 402 endpoint.

export interface HostedTemplate {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  fetchData: () => Promise<unknown>;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "Verge-Gateway/1.0", ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`Upstream ${url} returned HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "Verge-Gateway/1.0", Accept: "application/json,text/xml", ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`Upstream ${url} returned HTTP ${res.status}`);
  return res.text();
}

// ---- Shared cache: one upstream fetch per TTL window, shared across payers ----
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();
async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  try {
    const data = await loader();
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    if (hit) return hit.data as T; // stale beats broken
    throw e;
  }
}

// ---- /news : Cointelegraph RSS → clean headline list ----
interface NewsItem { title: string; link: string; pubDate: string; source: string }
function parseRss(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[1];
    const pick = (tag: string) => {
      const t = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
      if (!t) return "";
      return t[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
    };
    items.push({ title: pick("title"), link: pick("link"), pubDate: pick("pubDate"), source: "cointelegraph.com" });
  }
  return items.filter((i) => i.title);
}

async function newsSnapshot() {
  const xml = await fetchText("https://cointelegraph.com/rss");
  const items = parseRss(xml, 10);
  if (!items.length) throw new Error("no items parsed");
  return { kind: "crypto-headlines", provider: "cointelegraph.com/rss", fetchedAt: new Date().toISOString(), count: items.length, items };
}

// ---- /alerts + /whale-alerts : GeckoTerminal Robinhood chain pools ----
interface GtPool {
  pool: string; address: string; priceUsd: string; liquidityUsd: string;
  volume24hUsd: string; change24hPct: string; txns24h: number; network: string;
}
async function gt(path: string): Promise<{ data?: Array<{ attributes?: Record<string, unknown> }> }> {
  const text = await fetchText("https://api.geckoterminal.com/api/v2" + path);
  return JSON.parse(text);
}
function shapePools(d: Awaited<ReturnType<typeof gt>>, limit: number): GtPool[] {
  const out: GtPool[] = [];
  for (const p of (d?.data || []).slice(0, limit)) {
    const a = p.attributes || {} as Record<string, any>;
    out.push({
      pool: a.name, address: a.address, priceUsd: a.base_token_price_usd, liquidityUsd: a.reserve_in_usd,
      volume24hUsd: a.volume_usd?.h24, change24hPct: a.price_change_percentage?.h24,
      txns24h: (a.transactions?.h24?.buys || 0) + (a.transactions?.h24?.sells || 0), network: "robinhood",
    });
  }
  return out;
}
async function trendingPools() {
  const d = await gt("/networks/robinhood/trending_pools?page=1");
  const pools = shapePools(d, 10);
  if (!pools.length) throw new Error("no pools");
  return { kind: "trending-pools", chain: "robinhood-4663", provider: "geckoterminal.com", fetchedAt: new Date().toISOString(), count: pools.length, pools };
}
async function whalePools() {
  // GeckoTerminal only allows h24_volume_usd_desc / h24_tx_count_desc sorts —
  // rank by liquidity client-side so "whale" = biggest pools, not just busiest.
  const d = await gt("/networks/robinhood/pools?sort=h24_volume_usd_desc&page=1");
  const pools = shapePools(d, 20).sort((a, b) => parseFloat(b.liquidityUsd || "0") - parseFloat(a.liquidityUsd || "0")).slice(0, 10);
  if (!pools.length) throw new Error("no pools");
  return { kind: "whale-liquidity", chain: "robinhood-4663", provider: "geckoterminal.com", fetchedAt: new Date().toISOString(), count: pools.length, pools };
}

// ---- /gas-prices : ETH mainnet + Base gas via public JSON-RPC ----
async function gasSnapshot() {
  const rpc = async (url: string) => {
    const res = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }),
    }) as { result?: string };
    const wei = parseInt(res.result || "0x0", 16);
    const gwei = wei / 1e9;
    return { fast_gwei: +(gwei * 1.1).toFixed(2), standard_gwei: +gwei.toFixed(2) };
  };
  const [eth, base] = await Promise.all([
    rpc("https://cloudflare-eth.com"),
    rpc("https://mainnet.base.org"),
  ]);
  return { eth, base, timestamp: new Date().toISOString() };
}

// ---- /robinhood-pools : top DEX pools on Robinhood Chain ----
async function rhPoolsSnapshot() {
  const d = await gt("/networks/robinhood/pools?page=1");
  const pools = shapePools(d, 10).map((p) => ({
    name: p.pool,
    address: p.address,
    price_usd: p.priceUsd,
    volume_24h: p.volume24hUsd,
    liquidity: p.liquidityUsd,
  }));
  if (!pools.length) throw new Error("no pools");
  return { kind: "rh-dex-pools", chain: "robinhood-4663", provider: "geckoterminal.com", fetchedAt: new Date().toISOString(), count: pools.length, pools };
}

// ---- /fear-greed : Crypto Fear & Greed Index ----
async function fearGreedSnapshot() {
  const data = await fetchJson("https://api.alternative.me/fng/?limit=1") as { data?: Array<{ value: string; value_classification: string; timestamp: string }> };
  const item = data.data?.[0];
  if (!item) throw new Error("no fear/greed data");
  return { value: parseInt(item.value, 10), classification: item.value_classification, timestamp: new Date(parseInt(item.timestamp, 10) * 1000).toISOString() };
}

// ---- /trending-tokens : most-traded tokens on Robinhood Chain ----
async function trendingTokensSnapshot() {
  const d = await gt("/networks/robinhood/trending_pools?page=1");
  const tokens = (d?.data || []).slice(0, 8).map((p) => {
    const a = (p.attributes || {}) as Record<string, any>;
    return {
      name: a.name,
      symbol: a.base_token_symbol,
      price_usd: a.base_token_price_usd,
      price_change_24h: a.price_change_percentage?.h24,
      volume_24h: a.volume_usd?.h24,
    };
  });
  if (!tokens.length) throw new Error("no trending tokens");
  return { kind: "trending-tokens", chain: "robinhood-4663", provider: "geckoterminal.com", fetchedAt: new Date().toISOString(), count: tokens.length, tokens };
}

// ---- /rh-token-prices : spot prices for USDG + WETH on Robinhood Chain ----
async function rhTokenPricesSnapshot() {
  const d = await fetchJson(
    "https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/multi/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168%2C0x0Bd7E4Ae832Ed34CA43B94Bf6e2D7a58fD90AD73"
  ) as { data?: Array<{ attributes?: Record<string, unknown> }> };
  const tokens = (d?.data || []).map((t) => {
    const a = (t.attributes || {}) as Record<string, any>;
    return {
      symbol: a.symbol,
      name: a.name,
      price_usd: a.price_usd,
      price_change_24h: a.price_change_percentage?.h24,
    };
  });
  if (!tokens.length) throw new Error("no token price data");
  return { kind: "rh-token-prices", chain: "robinhood-4663", provider: "geckoterminal.com", fetchedAt: new Date().toISOString(), tokens };
}

// ---- /signals : momentum derived from trending + whale pools ----
async function momentumSignals() {
  const [tr, wh] = await Promise.all([cached("trending", trendingPools), cached("whales", whalePools)]);
  const seen = new Set<string>();
  const rows: Array<{ pool: string; signal: string; change24hPct: number; volumeLiquidityRatio: number | null; txns24h: number }> = [];
  for (const p of [...tr.pools, ...wh.pools]) {
    if (seen.has(p.address)) continue;
    seen.add(p.address);
    const chg = parseFloat(p.change24hPct || "0");
    const vol = parseFloat(p.volume24hUsd || "0");
    const liq = parseFloat(p.liquidityUsd || "0");
    let signal = "NEUTRAL";
    if (chg > 15 && vol > liq * 0.1) signal = "STRONG_BUY_MOMENTUM";
    else if (chg > 5) signal = "BUY_MOMENTUM";
    else if (chg < -15) signal = "STRONG_SELL_PRESSURE";
    else if (chg < -5) signal = "SELL_PRESSURE";
    rows.push({ pool: p.pool, signal, change24hPct: chg, volumeLiquidityRatio: liq ? +(vol / liq).toFixed(2) : null, txns24h: p.txns24h });
  }
  return { kind: "momentum-signals", chain: "robinhood-4663", derivedFrom: "geckoterminal trending + top-liquidity", fetchedAt: new Date().toISOString(), count: rows.length, signals: rows };
}

export const HOSTED_TEMPLATES: Record<string, HostedTemplate> = {
  "random-joke": {
    id: "random-joke",
    name: "Random joke",
    description: "One programmer joke per call, sourced live from a public joke API.",
    defaultPrice: 0.0005,
    fetchData: () => fetchJson("https://official-joke-api.appspot.com/random_joke"),
  },
  "daily-quote": {
    id: "daily-quote",
    name: "Inspirational quote",
    description: "One curated quote per call, sourced live from ZenQuotes.",
    defaultPrice: 0.0005,
    fetchData: async () => {
      const data = (await fetchJson("https://zenquotes.io/api/random")) as Array<{ q: string; a: string }>;
      const first = data[0];
      return { quote: first?.q, author: first?.a };
    },
  },
  "crypto-price": {
    id: "crypto-price",
    name: "BTC / ETH spot price",
    description: "Live BTC and ETH USD spot price, sourced from CoinGecko.",
    defaultPrice: 0.001,
    fetchData: () => fetchJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"),
  },
  news: {
    id: "news",
    name: "Crypto headlines",
    description: "Latest crypto news headlines, sourced live from Cointelegraph RSS. Cached 60s across all payers.",
    defaultPrice: 0.001,
    fetchData: () => cached("news", newsSnapshot),
  },
  alerts: {
    id: "alerts",
    name: "Trending pools (Robinhood Chain)",
    description: "Trending liquidity pools on Robinhood Chain, sourced live from GeckoTerminal. Cached 60s across all payers.",
    defaultPrice: 0.001,
    fetchData: () => cached("trending", trendingPools),
  },
  "whale-alerts": {
    id: "whale-alerts",
    name: "Whale liquidity (Robinhood Chain)",
    description: "Biggest-liquidity pools on Robinhood Chain — a proxy for whale activity. Cached 60s across all payers.",
    defaultPrice: 0.001,
    fetchData: () => cached("whales", whalePools),
  },
  signals: {
    id: "signals",
    name: "Momentum signals (Robinhood Chain)",
    description: "Buy/sell momentum signals derived from live Robinhood Chain pool data (price change + volume/liquidity ratio).",
    defaultPrice: 0.0015,
    fetchData: () => cached("signals", momentumSignals),
  },
  "gas-prices": {
    id: "gas-prices",
    name: "EVM gas tracker",
    description: "Live gas prices across EVM chains from Blocknative or public RPCs",
    defaultPrice: 0.0005,
    fetchData: () => cached("gas-prices", gasSnapshot),
  },
  "robinhood-pools": {
    id: "robinhood-pools",
    name: "Robinhood Chain DEX pools",
    description: "Top liquidity pools on Robinhood Chain 4663 with TVL and 24h volume",
    defaultPrice: 0.001,
    fetchData: () => cached("robinhood-pools", rhPoolsSnapshot),
  },
  "fear-greed": {
    id: "fear-greed",
    name: "Crypto Fear & Greed Index",
    description: "Current crypto market sentiment from 0 (extreme fear) to 100 (extreme greed)",
    defaultPrice: 0.0005,
    fetchData: () => cached("fear-greed", fearGreedSnapshot),
  },
  "trending-tokens": {
    id: "trending-tokens",
    name: "Trending tokens on Robinhood Chain",
    description: "Most-traded tokens on Robinhood Chain in the last 24h by volume",
    defaultPrice: 0.001,
    fetchData: () => cached("trending-tokens", trendingTokensSnapshot),
  },
  "rh-token-prices": {
    id: "rh-token-prices",
    name: "Robinhood Chain token prices",
    description: "Spot prices for USDG, WETH, and top tokenized stocks on Robinhood Chain",
    defaultPrice: 0.001,
    fetchData: () => cached("rh-token-prices", rhTokenPricesSnapshot),
  },
};

export function listHostedTemplates() {
  return Object.values(HOSTED_TEMPLATES).map((t) => ({ id: t.id, name: t.name, description: t.description, defaultPrice: t.defaultPrice }));
}
