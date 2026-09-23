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
};

export function listHostedTemplates() {
  return Object.values(HOSTED_TEMPLATES).map((t) => ({ id: t.id, name: t.name, description: t.description, defaultPrice: t.defaultPrice }));
}
