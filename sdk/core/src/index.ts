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
const robinhoodFallbacks = ["https://robinhood.drpc.org", "https://robinhood-rpc.publicnode.com", "https://robinhood.rpc.blxrbdn.com"];
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
  const fallbacks = network === "robinhood-mainnet" ? robinhoodFallbacks : [];
  const candidates = [explicitRpcUrl, alchemyUrl(network), rail.defaultRpcUrl, ...fallbacks].filter((u): u is string => Boolean(u));
  return Array.from(new Set(candidates));
}

/** viem transport options: providers on our rails (notably Robinhood Chain) reject requests without a user-agent. */
function transportFor(url: string) {
  return http(url, { fetchOptions: { headers: { "user-agent": "Verge-Core/1.0" } } } as Parameters<typeof http>[1]);
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
  /** x402 v2 ResourceInfo.serviceName advertised in PAYMENT-REQUIRED. */
  resourceName?: string;
  /** x402 v2 ResourceInfo.description advertised in PAYMENT-REQUIRED. */
  resourceDescription?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

/** Optional: release a claim (used when a later check fails after claiming). */
export interface CancellableReplayStore extends ReplayStore {
  remove(txHash: string): Promise<void> | void;
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
  | { kind: "unlocked"; rail: PaymentRail; tx: string; payer: string | null }
  | { kind: "error"; detail: string };

interface EvmVerifyArgs { client: ReturnType<typeof createPublicClient>; tx: Hash; recipient: string; amount: number; rail: EvmRail; }

export async function verifyStablecoinTransferDetailed({ client, tx, recipient, amount, rail }: EvmVerifyArgs): Promise<{ ok: boolean; payer: string | null }> {
  if (!tx || !/^0x[a-fA-F0-9]{64}$/.test(tx)) return { ok: false, payer: null };
  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | null;
  try {
    receipt = await client.getTransactionReceipt({ hash: tx });
  } catch {
    // viem throws TransactionReceiptNotFoundError for unknown txs — that is "not paid", not an RPC outage.
    receipt = null;
  }
  if (!receipt || receipt.status !== "success") return { ok: false, payer: null };
  const amountRaw = parseUnits(String(amount), rail.decimals);
  const recipientLower = recipient.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== rail.tokenContract.toLowerCase() || log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const toAddr = (`0x${toTopic.slice(26)}`).toLowerCase();
    if (toAddr !== recipientLower) continue;
    if (BigInt(log.data) >= amountRaw) {
      const fromTopic = log.topics[1];
      const payer = fromTopic ? `0x${fromTopic.slice(26)}`.toLowerCase() : null;
      return { ok: true, payer };
    }
  }
  return { ok: false, payer: null };
}

export async function verifyStablecoinTransfer(args: EvmVerifyArgs): Promise<boolean> {
  return (await verifyStablecoinTransferDetailed(args)).ok;
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

export async function evaluatePayment(opts: PaywallOptions, tx: string | undefined | null, nonce: string | undefined | null, resource?: { url?: string; pathname?: string }): Promise<PaymentOutcome> {
  const network = opts.network || "robinhood-mainnet";
  const rail = getRail(network);
  const realm = opts.realm || "verge";
  const challengeStore = opts.challengeStore || memoryChallengeStore;
  if (!tx) {
    const challenge = buildChallenge(opts, realm, network);
    await challengeStore.add(challenge);
    const resourceInfo: ResourceInfo = {
      url: resource?.url || `x402:${resource?.pathname || "verge-resource"}`,
      mimeType: "application/json",
      ...(opts.resourceName ? { serviceName: opts.resourceName.slice(0, 32) } : {}),
      ...(opts.resourceDescription ? { description: opts.resourceDescription } : {}),
    };
    return { kind: "challenge", challenge, headers: challengeHeadersV2(challenge, realm, resourceInfo) };
  }
  try {
    if (!nonce) return { kind: "nonce_required" };
    const challenge = await challengeStore.consume(nonce, { network, recipient: opts.recipient, amount: opts.amount });
    if (!challenge) return { kind: "nonce_invalid" };
    const replayKey = `${network}:${tx.toLowerCase()}`;
    const alreadyUsed = opts.replayStore ? await opts.replayStore.has(replayKey) : memoryReplayStore.has(replayKey);
    if (alreadyUsed) return { kind: "replayed" };

    let ok = false;
    let payer: string | null = null;
    if (rail.kind === "evm") {
      let lastError: unknown;
      for (const url of rpcCandidates(network, opts.rpcUrl)) {
        try {
          const client = createPublicClient({ chain: rail.chain, transport: transportFor(url) });
          const result = await verifyStablecoinTransferDetailed({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, rail });
          ok = result.ok;
          payer = result.payer;
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
    return { kind: "unlocked", rail, tx, payer };
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

// ============================================================================
// x402 V2 wire compatibility — PAYMENT-REQUIRED / PAYMENT-SIGNATURE headers,
// CAIP-2 network identifiers, and the facilitator /verify + /settle contract.
//
// Verge settles via client-prepaid direct stablecoin transfers, which maps to
// the x402 v2 "upfront" payment flow (spec §6.1/§7.2): the client pays first,
// then /settle binds the on-chain proof (consuming the challenge nonce and
// marking the tx used) after read-only verification. Standard x402 v2 clients
// interop through the exact-scheme envelope below; Verge-native clients may
// keep using the X-Pay-* headers — both are accepted everywhere.
// ============================================================================

export const X402_VERSION = 2 as const;

/** CAIP-2 identifier for every supported rail. */
export const CAIP2_BY_NETWORK: Record<PaymentNetwork, string> = {
  "robinhood-mainnet": "eip155:4663",
  "ethereum-mainnet": "eip155:1",
  "base-mainnet": "eip155:8453",
  "arbitrum-mainnet": "eip155:42161",
  "polygon-mainnet": "eip155:137",
  "solana-mainnet": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sui-mainnet": "sui:mainnet",
};

export function caip2Of(network: PaymentNetwork): string {
  return CAIP2_BY_NETWORK[network];
}

/** Reverse CAIP-2 → Verge network label. Accepts legacy labels too. */
export function networkFromCaip2(caip2: string): PaymentNetwork | null {
  const normalized = String(caip2 || "").trim().toLowerCase();
  for (const [label, id] of Object.entries(CAIP2_BY_NETWORK)) {
    if (id.toLowerCase() === normalized) return label as PaymentNetwork;
  }
  if (normalized in PAYMENT_RAILS) return normalized as PaymentNetwork;
  return null;
}

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
}

/** x402 v2 PaymentRequirements (one entry of PaymentRequired.accepts). */
export interface X402PaymentRequirements {
  scheme: "exact";
  network: string; // CAIP-2
  amount: string; // atomic token units
  asset: string; // token contract / mint / coin type
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

/** x402 v2 PaymentRequired object. */
export interface X402PaymentRequired {
  x402Version: 2;
  error?: string;
  resource: ResourceInfo;
  accepts: X402PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

/** x402 v2 PaymentPayload — what the client sends back in PAYMENT-SIGNATURE. */
export interface X402PaymentPayload {
  x402Version?: number;
  resource?: ResourceInfo;
  accepted?: X402PaymentRequirements;
  payload: {
    /** Settlement transaction hash (Verge direct-transfer scheme). */
    tx?: string;
    /** Challenge nonce from the original 402 (extensions["x-verge"].info.nonce). */
    nonce?: string;
    /** Optional payer hint (address / owner / sender). */
    from?: string;
    [key: string]: unknown;
  };
  extensions?: Record<string, unknown>;
}

/** x402 v2 VerifyResponse (facilitator §7.1). */
export interface X402VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

/** x402 v2 SettleResponse (facilitator §7.2). */
export interface X402SettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
}

/**
 * Atomic replay-guard: the ReplayStore equivalent of test-and-set. Returns
 * true when this call WON the right to settle (key was unused), false when
 * another concurrent request already settled the same key. Implementations
 * MUST use a single atomic operation (e.g. INSERT ... ON CONFLICT ... RETURNING).
 */
export interface AtomicReplayStore extends ReplayStore {
  /** Returns true if this call claimed the key; false if it was already taken. */
  claim(txHash: string): Promise<boolean> | boolean;
}

function isAtomic(store: ReplayStore | undefined): store is AtomicReplayStore {
  return Boolean(store && typeof (store as AtomicReplayStore).claim === "function");
}

/** Release a replay claim when a later step fails; no-op for stores without remove(). */
async function releaseClaim(store: ReplayStore | undefined, key: string): Promise<void> {
  const removable = store as Partial<CancellableReplayStore> | undefined;
  if (removable && typeof removable.remove === "function") await removable.remove(key);
}

function atomicAmount(amountHuman: number, decimals: number): string {
  const raw = BigInt(Math.round(amountHuman * 10 ** decimals));
  return raw.toString();
}

export function humanAmount(amountAtomic: string | number, decimals: number): number {
  const raw = BigInt(String(Math.round(Number(amountAtomic))));
  return Number(raw) / 10 ** decimals;
}

/** Builds the exact-scheme requirements entry for one rail. */
export function buildPaymentRequirements(opts: {
  network: PaymentNetwork;
  amount: number; // human units
  payTo: string;
  resourceUrl: string;
  maxTimeoutSeconds?: number;
  challengeNonce?: string;
  memo?: string;
}): X402PaymentRequirements {
  const rail = getRail(opts.network);
  const extra: Record<string, unknown> = {
    assetTransferMethod: "direct-transfer",
    paymentFlow: "upfront",
    tokenSymbol: rail.asset,
    tokenDecimals: rail.decimals,
    vergeNetwork: opts.network, // legacy Verge label for mixed clients
  };
  if (opts.challengeNonce) extra.nonce = opts.challengeNonce;
  if (opts.memo) extra.memo = opts.memo;
  return {
    scheme: "exact",
    network: caip2Of(opts.network),
    amount: atomicAmount(opts.amount, rail.decimals),
    asset: tokenRefOf(rail),
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 600,
    extra,
  };
}

/** Full PaymentRequired object for a challenge, with the x-verge extension carrying the nonce. */
export function buildPaymentRequired(opts: {
  network: PaymentNetwork;
  amount: number; // human units
  payTo: string;
  resource: ResourceInfo;
  challengeNonce?: string;
  memo?: string;
  error?: string;
}): X402PaymentRequired {
  const accepts = [buildPaymentRequirements({ ...opts, resourceUrl: opts.resource.url })];
  const extensions = opts.challengeNonce
    ? {
        "x-verge": {
          info: { nonce: opts.challengeNonce, memo: opts.memo ?? "", rails: Object.keys(PAYMENT_RAILS) },
          schema: {
            type: "object",
            properties: { nonce: { type: "string" }, memo: { type: "string" }, rails: { type: "array", items: { type: "string" } } },
            required: ["nonce"],
          },
        },
      }
    : undefined;
  return { x402Version: X402_VERSION, error: opts.error, resource: opts.resource, accepts, extensions };
}

/** Base64-encodes a PaymentRequired object for the PAYMENT-REQUIRED header. */
export function encodePaymentRequired(pr: X402PaymentRequired): string {
  return Buffer.from(JSON.stringify(pr), "utf8").toString("base64");
}

/** Decodes the PAYMENT-REQUIRED header value back into the object. */
export function decodePaymentRequired(value: string): X402PaymentRequired | null {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as X402PaymentRequired;
  } catch {
    return null;
  }
}

/**
 * Challenge headers in BOTH dialects: the legacy X-Pay-* set plus the x402 v2
 * PAYMENT-REQUIRED header. One response serves legacy Verge clients and
 * standard x402 v2 agents at the same time.
 */
export function challengeHeadersV2(challenge: Challenge, realm: string, resource: ResourceInfo): Record<string, string> {
  const pr = buildPaymentRequired({
    network: challenge.network,
    amount: challenge.amount,
    payTo: challenge.recipient,
    resource,
    challengeNonce: challenge.nonce,
    memo: challenge.memo,
    error: "Payment required",
  });
  return {
    ...challengeHeaders(challenge, realm),
    "PAYMENT-REQUIRED": encodePaymentRequired(pr),
  };
}

/** Decodes a PAYMENT-SIGNATURE header (base64 JSON PaymentPayload). Returns null on garbage. */
export function decodePaymentSignature(value: string): X402PaymentPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as X402PaymentPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface ProofExtraction {
  tx: string | null;
  nonce: string | null;
  payerHint: string | null;
  network: string | null; // CAIP-2 or legacy label, as chosen by the client
}

/**
 * Pulls a payable proof out of either dialect:
 * - x402 v2: PAYMENT-SIGNATURE PaymentPayload (payload.tx + payload.nonce)
 * - Verge legacy: X-Pay-Tx + X-Pay-Nonce headers
 */
export function extractProof(payload: X402PaymentPayload | null, legacyTx?: string | null, legacyNonce?: string | null): ProofExtraction {
  if (payload) {
    return {
      tx: typeof payload.payload.tx === "string" ? payload.payload.tx : null,
      nonce: typeof payload.payload.nonce === "string" ? payload.payload.nonce : null,
      payerHint: typeof payload.payload.from === "string" ? payload.payload.from : null,
      network: payload.accepted?.network ?? null,
    };
  }
  return { tx: legacyTx || null, nonce: legacyNonce || null, payerHint: null, network: null };
}

function invalid(reason: string, payer?: string): X402VerifyResponse {
  return { isValid: false, invalidReason: reason, ...(payer ? { payer } : {}) };
}

export type FacilitatorOptions = Pick<PaywallOptions, "rpcUrl" | "replayStore" | "challengeStore" | "realm">;

/**
 * Facilitator-grade verify (x402 v2 §7.1): read-only. Resolves the rail from
 * the requirements' CAIP-2 network, verifies the settlement transaction on
 * chain, and reports validity WITHOUT committing any state.
 */
export async function verifyX402Payment(
  opts: FacilitatorOptions,
  paymentPayload: X402PaymentPayload,
  paymentRequirements: X402PaymentRequirements
): Promise<X402VerifyResponse> {
  try {
    const network = networkFromCaip2(paymentRequirements.network);
    if (!network) return invalid("unsupported_network");
    if (paymentRequirements.scheme !== "exact") return invalid("unsupported_scheme");
    const rail = getRail(network);

    const extra = (paymentRequirements.extra || {}) as Record<string, unknown>;
    const expectedNonce = typeof extra.nonce === "string" ? extra.nonce : null;
    const tx = typeof paymentPayload.payload.tx === "string" ? paymentPayload.payload.tx : null;
    if (!tx) return invalid("payment_payload_missing_tx");
    if (expectedNonce && paymentPayload.payload.nonce !== expectedNonce) return invalid("nonce_mismatch");

    // Amount must cover requirements (already atomic units).
    const amountHuman = humanAmount(paymentRequirements.amount, rail.decimals);
    if (paymentPayload.accepted && paymentPayload.accepted.amount !== paymentRequirements.amount) return invalid("amount_mismatch");
    if (paymentPayload.accepted && paymentPayload.accepted.payTo?.toLowerCase() !== paymentRequirements.payTo?.toLowerCase()) return invalid("payto_mismatch");

    const recipient = paymentRequirements.payTo;
    let payer: string | null = paymentPayload.payload.from && typeof paymentPayload.payload.from === "string" ? paymentPayload.payload.from : null;

    if (rail.kind === "evm") {
      let lastError: unknown;
      for (const url of rpcCandidates(network, opts.rpcUrl)) {
        try {
          const client = createPublicClient({ chain: rail.chain, transport: transportFor(url) });
          const result = await verifyStablecoinTransferDetailed({ client, tx: tx as Hash, recipient, amount: amountHuman, rail });
          if (result.ok) {
            if (result.payer) payer = result.payer;
            return { isValid: true, payer: payer || undefined };
          }
          return invalid("settlement_not_found_onchain");
        } catch (e) { lastError = e; continue; }
      }
      if (lastError) return invalid("rpc_unavailable");
      return invalid("rpc_unavailable");
    }

    if (rail.kind === "solana") {
      let lastError: unknown;
      for (const url of rpcCandidates(network, opts.rpcUrl)) {
        try {
          const ok = await verifySolanaUsdcTransfer(url, tx, recipient, amountHuman, rail);
          if (ok) return { isValid: true, payer: payer || undefined };
          return invalid("settlement_not_found_onchain");
        } catch (e) { lastError = e; continue; }
      }
      return invalid(lastError ? "rpc_unavailable" : "rpc_unavailable");
    }

    // Sui
    const okSui = await verifySuiUsdcTransfer(opts.rpcUrl || rail.defaultRpcUrl, tx, recipient, amountHuman, rail);
    return okSui ? { isValid: true, payer: payer || undefined } : invalid("settlement_not_found_onchain");
  } catch (e) {
    return invalid("verification_error");
  }
}

/**
 * Facilitator-grade settle (x402 v2 §7.2) for the upfront direct-transfer flow:
 * verifies the on-chain payment, then durably commits — consumes the challenge
 * nonce from the ChallengeStore and records the tx in the ReplayStore.
 */
export async function settleX402Payment(
  opts: FacilitatorOptions,
  paymentPayload: X402PaymentPayload,
  paymentRequirements: X402PaymentRequirements
): Promise<X402SettleResponse> {
  const network = networkFromCaip2(paymentRequirements.network);
  if (!network) return { success: false, errorReason: "unsupported_network", transaction: "", network: paymentRequirements.network };
  const rail = getRail(network);

  const check = await verifyX402Payment(opts, paymentPayload, paymentRequirements);
  if (!check.isValid) {
    return { success: false, errorReason: check.invalidReason, payer: check.payer, transaction: "", network: paymentRequirements.network };
  }

  const tx = String(paymentPayload.payload.tx);
  const nonce = typeof paymentPayload.payload.nonce === "string" ? paymentPayload.payload.nonce : null;
  const challengeStore = opts.challengeStore || memoryChallengeStore;
  const replayKey = `${network}:${tx.toLowerCase()}`;

  try {
    // Replay guard FIRST. With an AtomicReplayStore this is a single
    // test-and-set: concurrent settles of the same tx cannot both pass.
    if (isAtomic(opts.replayStore)) {
      const claimed = await opts.replayStore.claim(replayKey);
      if (!claimed) return { success: false, errorReason: "transaction_already_settled", payer: check.payer, transaction: tx, network: paymentRequirements.network };
      const consumed = nonce
        ? await challengeStore.consume(nonce, { network, recipient: paymentRequirements.payTo, amount: humanAmount(paymentRequirements.amount, rail.decimals) })
        : null;
      if (nonce && !consumed) {
        // Nonce lost the race — release the replay claim so a legitimate
        // settle with the proper nonce can still land.
        await releaseClaim(opts.replayStore, replayKey);
        return { success: false, errorReason: "nonce_unknown_or_expired", payer: check.payer, transaction: "", network: paymentRequirements.network };
      }
    } else {
      // Fallback path (plain ReplayStore): has→add window exists, but the
      // replay key is PRIMARY KEY in durable stores, so a duplicate add is
      // still rejected by the store itself.
      const alreadyUsed = opts.replayStore ? await opts.replayStore.has(replayKey) : memoryReplayStore.has(replayKey);
      if (alreadyUsed) return { success: false, errorReason: "transaction_already_settled", payer: check.payer, transaction: tx, network: paymentRequirements.network };
      if (nonce) {
        const consumed = await challengeStore.consume(nonce, { network, recipient: paymentRequirements.payTo, amount: humanAmount(paymentRequirements.amount, rail.decimals) });
        if (!consumed) return { success: false, errorReason: "nonce_unknown_or_expired", payer: check.payer, transaction: "", network: paymentRequirements.network };
      }
      if (opts.replayStore) await opts.replayStore.add(replayKey); else memoryReplayStore.add(replayKey);
    }
    return {
      success: true,
      payer: check.payer,
      transaction: tx,
      network: paymentRequirements.network,
      amount: paymentRequirements.amount,
    };
  } catch {
    return { success: false, errorReason: "settlement_store_unavailable", payer: check.payer, transaction: "", network: paymentRequirements.network };
  }
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

/** Public handles to the default process-local stores — for demos and simple integrations. */
export const defaultChallengeStore: ChallengeStore = memoryChallengeStore;
export const defaultReplayStore: AtomicReplayStore & CancellableReplayStore = {
  has: (txHash: string) => memoryReplayStore.has(txHash),
  add: (txHash: string) => { memoryReplayStore.add(txHash); },
  /** Atomic test-and-set for concurrent settles. */
  claim: (txHash: string) => !memoryReplayStore.has(txHash) && (memoryReplayStore.add(txHash), true),
  remove: (txHash: string) => { memoryReplayStore.delete(txHash); },
};
