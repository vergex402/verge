// @vergex402/core — framework-agnostic HTTP 402 payment verification.
// Robinhood/USDG is the default flagship rail. EVM (Ethereum, Base, Arbitrum, Polygon),
// Solana, and Sui are explicit opt-in rails. Adapters (@vergex402/express, @vergex402/hono)
// only translate framework requests/responses — all verification logic lives here.

import { randomBytes } from "node:crypto";
import { createPublicClient, defineChain, http, parseUnits, type Address, type Chain, type Hash } from "viem";

const robinhoodChain = defineChain({
  id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Chain Explorer", url: "https://robinhoodchain.blockscout.com" } },
});
const ethereumChain = defineChain({ id: 1, name: "Ethereum", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://ethereum-rpc.publicnode.com"] } }, blockExplorers: { default: { name: "Etherscan", url: "https://etherscan.io" } } });
const baseChain = defineChain({ id: 8453, name: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://mainnet.base.org"] } }, blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } } });
const arbitrumChain = defineChain({ id: 42161, name: "Arbitrum One", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } }, blockExplorers: { default: { name: "Arbiscan", url: "https://arbiscan.io" } } });
const polygonChain = defineChain({ id: 137, name: "Polygon", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 }, rpcUrls: { default: { http: ["https://polygon-bor-rpc.publicnode.com"] } }, blockExplorers: { default: { name: "Polygonscan", url: "https://polygonscan.com" } } });

export type PaymentNetwork = "robinhood-mainnet" | "ethereum-mainnet" | "base-mainnet" | "arbitrum-mainnet" | "polygon-mainnet" | "solana-mainnet" | "sui-mainnet";

interface EvmRail {
  kind: "evm"; id: PaymentNetwork; chainId: number; chain: Chain; asset: "USDG" | "USDC";
  tokenContract: Address; decimals: number; explorerUrl: string; defaultRpcUrl: string;
}
interface SolanaRail {
  kind: "solana"; id: PaymentNetwork; asset: "USDC"; mint: string; decimals: number; explorerUrl: string; defaultRpcUrl: string;
}
interface SuiRail {
  kind: "sui"; id: PaymentNetwork; asset: "USDC"; coinType: string; decimals: number; explorerUrl: string; defaultRpcUrl: string;
}
export type PaymentRail = EvmRail | SolanaRail | SuiRail;

/** Official canonical stablecoin rails. Robinhood/USDG stays the Verge flagship/default. */
export const PAYMENT_RAILS: Record<PaymentNetwork, PaymentRail> = {
  "robinhood-mainnet": {
    kind: "evm", id: "robinhood-mainnet", chainId: 4663, chain: robinhoodChain, asset: "USDG",
    tokenContract: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6,
    explorerUrl: "https://robinhoodchain.blockscout.com", defaultRpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  },
  "ethereum-mainnet": {
    kind: "evm", id: "ethereum-mainnet", chainId: 1, chain: ethereumChain, asset: "USDC",
    tokenContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6,
    explorerUrl: "https://etherscan.io", defaultRpcUrl: "https://ethereum-rpc.publicnode.com",
  },
  "base-mainnet": {
    kind: "evm", id: "base-mainnet", chainId: 8453, chain: baseChain, asset: "USDC",
    tokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6,
    explorerUrl: "https://basescan.org", defaultRpcUrl: "https://mainnet.base.org",
  },
  "arbitrum-mainnet": {
    kind: "evm", id: "arbitrum-mainnet", chainId: 42161, chain: arbitrumChain, asset: "USDC",
    tokenContract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6,
    explorerUrl: "https://arbiscan.io", defaultRpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  "polygon-mainnet": {
    kind: "evm", id: "polygon-mainnet", chainId: 137, chain: polygonChain, asset: "USDC",
    tokenContract: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6,
    explorerUrl: "https://polygonscan.com", defaultRpcUrl: "https://polygon-bor-rpc.publicnode.com",
  },
  "solana-mainnet": {
    kind: "solana", id: "solana-mainnet", asset: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6,
    explorerUrl: "https://explorer.solana.com", defaultRpcUrl: "https://api.mainnet-beta.solana.com",
  },
  "sui-mainnet": {
    kind: "sui", id: "sui-mainnet", asset: "USDC",
    coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC", decimals: 6,
    explorerUrl: "https://suiscan.xyz/mainnet", defaultRpcUrl: "https://graphql.mainnet.sui.io/graphql",
  },
};

export const USDG_MAINNET = (PAYMENT_RAILS["robinhood-mainnet"] as EvmRail).tokenContract;
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Alchemy subdomains per rail. Sui has no Alchemy coverage, so it always uses its public GraphQL RPC. */
const ALCHEMY_SUBDOMAINS: Partial<Record<PaymentNetwork, string>> = {
  "robinhood-mainnet": "robinhood-mainnet",
  "ethereum-mainnet": "eth-mainnet",
  "base-mainnet": "base-mainnet",
  "arbitrum-mainnet": "arb-mainnet",
  "polygon-mainnet": "polygon-mainnet",
  "solana-mainnet": "solana-mainnet",
};

function alchemyUrl(network: PaymentNetwork): string | null {
  const key = process.env.ALCHEMY_API_KEY;
  const subdomain = ALCHEMY_SUBDOMAINS[network];
  if (!key || !subdomain) return null;
  return `https://${subdomain}.g.alchemy.com/v2/${key}`;
}

/** Ordered RPC candidates for a rail: explicit override, then Alchemy (if configured), then the public default. */
export function rpcCandidates(network: PaymentNetwork, explicitRpcUrl?: string): string[] {
  const rail = getRail(network);
  const candidates = [explicitRpcUrl, alchemyUrl(network), rail.defaultRpcUrl].filter((u): u is string => Boolean(u));
  return Array.from(new Set(candidates));
}

export function getRail(network: PaymentNetwork | string = "robinhood-mainnet"): PaymentRail {
  const rail = PAYMENT_RAILS[network as PaymentNetwork];
  if (!rail) throw new Error(`Unsupported payment network: ${network}`);
  return rail;
}

export function listRails(): PaymentRail[] { return Object.values(PAYMENT_RAILS); }

export interface PaywallOptions {
  amount: number;
  recipient: string;
  /** Defaults to Robinhood/USDG. Opt into Ethereum, Base, Arbitrum, Polygon, Solana, or Sui explicitly. */
  network?: PaymentNetwork;
  rpcUrl?: string;
  replayStore?: ReplayStore;
  /** Stores issued nonces so a paid retry must correspond to a real 402 challenge. Defaults to in-memory storage. */
  challengeStore?: ChallengeStore;
  realm?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

export interface ChallengeStore {
  add(challenge: Challenge): Promise<void> | void;
  consume(nonce: string, expected: Pick<Challenge, "network" | "recipient" | "amount">): Promise<Challenge | null> | Challenge | null;
}

export interface Challenge {
  nonce: string;
  amount: number;
  token: string;
  tokenRef: string;
  network: PaymentNetwork;
  chainId: number | null;
  recipient: string;
  memo: string;
}

export function defaultRpcUrl(network: PaymentNetwork | string): string { return getRail(network).defaultRpcUrl; }

function tokenRefOf(rail: PaymentRail): string {
  if (rail.kind === "evm") return rail.tokenContract;
  if (rail.kind === "solana") return rail.mint;
  return rail.coinType;
}
function chainIdOf(rail: PaymentRail): number | null { return rail.kind === "evm" ? rail.chainId : null; }
/** Numeric chain ID for EVM rails, null for Solana/Sui (no integer chain ID). */
export function railChainId(rail: PaymentRail): number | null { return chainIdOf(rail); }

/** Human-readable chain/network label, safe across EVM, Solana, and Sui rails. */
export function railChainName(rail: PaymentRail): string {
  if (rail.kind === "evm") return rail.chain.name;
  if (rail.kind === "solana") return "Solana";
  return "Sui";
}

/** Token/mint/coin-type reference, safe across EVM, Solana, and Sui rails. */
export function railTokenRef(rail: PaymentRail): string { return tokenRefOf(rail); }

export function buildChallenge(opts: PaywallOptions, realm: string, network: PaymentNetwork): Challenge {
  const rail = getRail(network);
  const nonce = randomBytes(16).toString("hex");
  return { nonce, amount: opts.amount, token: rail.asset, tokenRef: tokenRefOf(rail), network, chainId: chainIdOf(rail), recipient: opts.recipient, memo: `${realm}:${nonce}` };
}

export function challengeHeaders(challenge: Challenge, realm: string): Record<string, string> {
  return {
    "WWW-Authenticate": `x402 realm="${realm}", nonce="${challenge.nonce}", amount="${challenge.amount}", recipient="${challenge.recipient}", network="${challenge.network}"`,
    "X-Pay-Token": challenge.token,
    "X-Pay-Network": challenge.network,
    "X-Pay-Chain-Id": challenge.chainId === null ? "" : String(challenge.chainId),
    "X-Pay-Amount": String(challenge.amount),
    "X-Pay-Recipient": challenge.recipient,
    "X-Pay-Nonce": challenge.nonce,
    "X-Pay-Memo": challenge.memo,
  };
}

export type PaymentOutcome =
  | { kind: "challenge"; challenge: Challenge; headers: Record<string, string> }
  | { kind: "nonce_required" }
  | { kind: "nonce_invalid" }
  | { kind: "replayed" }
  | { kind: "invalid" }
  | { kind: "unlocked"; rail: PaymentRail }
  | { kind: "error"; detail: string };

interface EvmVerifyArgs { client: ReturnType<typeof createPublicClient>; tx: Hash; recipient: string; amount: number; rail: EvmRail; }

export async function verifyStablecoinTransfer({ client, tx, recipient, amount, rail }: EvmVerifyArgs): Promise<boolean> {
  if (!tx || !/^0x[a-fA-F0-9]{64}$/.test(tx)) return false;
  const receipt = await client.getTransactionReceipt({ hash: tx });
  if (!receipt || receipt.status !== "success") return false;
  const amountRaw = parseUnits(String(amount), rail.decimals);
  const recipientLower = recipient.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== rail.tokenContract.toLowerCase() || log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const toAddr = (`0x${toTopic.slice(26)}`).toLowerCase();
    if (toAddr !== recipientLower) continue;
    if (BigInt(log.data) >= amountRaw) return true;
  }
  return false;
}

/** Backward-compatible Robinhood/USDG verifier alias. */
export const verifyUsdgTransfer = verifyStablecoinTransfer;

async function jsonRpc(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json() as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result;
}

/** Verifies a USDC transfer on Solana by inspecting confirmed transaction token balance deltas. */
export async function verifySolanaUsdcTransfer(rpcUrl: string, signature: string, recipientOwner: string, amount: number, rail: SolanaRail): Promise<boolean> {
  if (!signature || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return false;
  const result = await jsonRpc(rpcUrl, "getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]) as {
    meta?: { err: unknown; preTokenBalances?: Array<{ owner?: string; mint?: string; uiTokenAmount?: { amount: string } }>; postTokenBalances?: Array<{ owner?: string; mint?: string; uiTokenAmount?: { amount: string } }> };
  } | null;
  if (!result || !result.meta || result.meta.err) return false;
  const pre = result.meta.preTokenBalances || [];
  const post = result.meta.postTokenBalances || [];
  const amountRaw = BigInt(Math.round(amount * 10 ** rail.decimals));
  const preFor = (owner: string) => pre.find((b) => b.owner === owner && b.mint === rail.mint);
  const postFor = (owner: string) => post.find((b) => b.owner === owner && b.mint === rail.mint);
  const recipientPost = postFor(recipientOwner);
  if (!recipientPost) return false;
  const before = BigInt(preFor(recipientOwner)?.uiTokenAmount?.amount || "0");
  const after = BigInt(recipientPost.uiTokenAmount?.amount || "0");
  return after - before >= amountRaw;
}

/** Verifies a USDC transfer on Sui by inspecting the finalized transaction's balance changes via Sui GraphQL RPC (JSON-RPC was decommissioned in 2026). */
export async function verifySuiUsdcTransfer(rpcUrl: string, digest: string, recipient: string, amount: number, rail: SuiRail): Promise<boolean> {
  if (!digest || !/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(digest)) return false;
  const query = `query($d: String!) { transaction(digest: $d) { effects { status balanceChanges(first: 50) { nodes { owner { address } coinType { repr } amount } } } } }`;
  const res = await fetch(rpcUrl, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { d: digest } }),
  });
  const body = await res.json() as {
    data?: { transaction?: { effects?: { status?: string; balanceChanges?: { nodes?: Array<{ owner?: { address?: string }; coinType?: { repr?: string }; amount?: string }> } } } };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Sui GraphQL error");
  const effects = body.data?.transaction?.effects;
  if (!effects || effects.status !== "SUCCESS") return false;
  const amountRaw = BigInt(Math.round(amount * 10 ** rail.decimals));
  const recipientLower = recipient.toLowerCase();
  for (const change of effects.balanceChanges?.nodes || []) {
    if (change.coinType?.repr !== rail.coinType) continue;
    if ((change.owner?.address || "").toLowerCase() !== recipientLower) continue;
    const delta = BigInt(change.amount || "0");
    if (delta >= amountRaw) return true;
  }
  return false;
}

export async function evaluatePayment(opts: PaywallOptions, tx: string | undefined | null, nonce: string | undefined | null): Promise<PaymentOutcome> {
  const network = opts.network || "robinhood-mainnet";
  const rail = getRail(network);
  const realm = opts.realm || "verge";
  const challengeStore = opts.challengeStore || memoryChallengeStore;
  if (!tx) {
    const challenge = buildChallenge(opts, realm, network);
    await challengeStore.add(challenge);
    return { kind: "challenge", challenge, headers: challengeHeaders(challenge, realm) };
  }
  try {
    if (!nonce) return { kind: "nonce_required" };
    const challenge = await challengeStore.consume(nonce, { network, recipient: opts.recipient, amount: opts.amount });
    if (!challenge) return { kind: "nonce_invalid" };
    const replayKey = `${network}:${tx.toLowerCase()}`;
    const alreadyUsed = opts.replayStore ? await opts.replayStore.has(replayKey) : memoryReplayStore.has(replayKey);
    if (alreadyUsed) return { kind: "replayed" };

    let ok = false;
    if (rail.kind === "evm") {
      let lastError: unknown;
      for (const url of rpcCandidates(network, opts.rpcUrl)) {
        try {
          const client = createPublicClient({ chain: rail.chain, transport: http(url) });
          ok = await verifyStablecoinTransfer({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, rail });
          lastError = undefined;
          break;
        } catch (e) { lastError = e; continue; }
      }
      if (lastError) throw lastError;
    } else if (rail.kind === "solana") {
      let lastError: unknown;
      for (const url of rpcCandidates(network, opts.rpcUrl)) {
        try {
          ok = await verifySolanaUsdcTransfer(url, tx, opts.recipient, opts.amount, rail);
          lastError = undefined;
          break;
        } catch (e) { lastError = e; continue; }
      }
      if (lastError) throw lastError;
    } else {
      ok = await verifySuiUsdcTransfer(opts.rpcUrl || rail.defaultRpcUrl, tx, opts.recipient, opts.amount, rail);
    }
    if (!ok) return { kind: "invalid" };
    if (opts.replayStore) await opts.replayStore.add(replayKey); else memoryReplayStore.add(replayKey);
    return { kind: "unlocked", rail };
  } catch (e) { return { kind: "error", detail: String(e instanceof Error ? e.message : e) }; }
}

export function paymentProofHeaders(txHash: string, nonce: string): Record<string, string> {
  return { "X-Pay-Tx": txHash, "X-Pay-Nonce": nonce };
}

export function parseX402Authenticate(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = header.trim().replace(/^x402\s+/i, "");
  for (const part of body.split(/,\s*/)) {
    const [key, ...rest] = part.split("=");
    if (!key || rest.length === 0) continue;
    out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
  return out;
}

const memoryReplayStore = new Set<string>();
const memoryChallengeStore: ChallengeStore = {
  _items: new Map<string, Challenge>(),
  add(challenge: Challenge) { (this._items as Map<string, Challenge>).set(challenge.nonce, challenge); },
  consume(nonce: string, expected: Pick<Challenge, "network" | "recipient" | "amount">) {
    const items = this._items as Map<string, Challenge>;
    const challenge = items.get(nonce);
    items.delete(nonce);
    if (!challenge) return null;
    if (challenge.network !== expected.network) return null;
    if (challenge.recipient.toLowerCase() !== expected.recipient.toLowerCase()) return null;
    if (challenge.amount !== expected.amount) return null;
    return challenge;
  },
} as ChallengeStore & { _items: Map<string, Challenge> };
