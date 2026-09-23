// @vergex402/core — framework-agnostic HTTP 402 payment verification for EVM rails.
// Adapters (@vergex402/express, @vergex402/hono) only translate framework requests/responses.

import { randomBytes } from "node:crypto";
import { createPublicClient, defineChain, http, parseUnits, type Address, type Chain, type Hash } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Chain Explorer", url: "https://robinhoodchain.blockscout.com" } },
});
const baseChain = defineChain({ id: 8453, name: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://mainnet.base.org"] } }, blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } } });
const arbitrumChain = defineChain({ id: 42161, name: "Arbitrum One", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } }, blockExplorers: { default: { name: "Arbiscan", url: "https://arbiscan.io" } } });
const polygonChain = defineChain({ id: 137, name: "Polygon", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 }, rpcUrls: { default: { http: ["https://polygon-bor-rpc.publicnode.com"] } }, blockExplorers: { default: { name: "Polygonscan", url: "https://polygonscan.com" } } });

export type PaymentNetwork = "robinhood-mainnet" | "base-mainnet" | "arbitrum-mainnet" | "polygon-mainnet";

export interface PaymentRail {
  id: PaymentNetwork;
  chainId: number;
  chain: Chain;
  asset: "USDG" | "USDC";
  tokenContract: Address;
  decimals: number;
  explorerUrl: string;
  defaultRpcUrl: string;
}

/** Official canonical stablecoin rails. Robinhood/USDG stays the Verge flagship/default. */
export const PAYMENT_RAILS: Record<PaymentNetwork, PaymentRail> = {
  "robinhood-mainnet": {
    id: "robinhood-mainnet", chainId: 4663, chain: robinhoodChain, asset: "USDG",
    tokenContract: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6,
    explorerUrl: "https://robinhoodchain.blockscout.com", defaultRpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  },
  "base-mainnet": {
    id: "base-mainnet", chainId: 8453, chain: baseChain, asset: "USDC",
    tokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6,
    explorerUrl: "https://basescan.org", defaultRpcUrl: "https://mainnet.base.org",
  },
  "arbitrum-mainnet": {
    id: "arbitrum-mainnet", chainId: 42161, chain: arbitrumChain, asset: "USDC",
    tokenContract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6,
    explorerUrl: "https://arbiscan.io", defaultRpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  "polygon-mainnet": {
    id: "polygon-mainnet", chainId: 137, chain: polygonChain, asset: "USDC",
    tokenContract: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6,
    explorerUrl: "https://polygonscan.com", defaultRpcUrl: "https://polygon-bor-rpc.publicnode.com",
  },
};

export const USDG_MAINNET = PAYMENT_RAILS["robinhood-mainnet"].tokenContract;
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function getRail(network: PaymentNetwork | string = "robinhood-mainnet"): PaymentRail {
  const rail = PAYMENT_RAILS[network as PaymentNetwork];
  if (!rail) throw new Error(`Unsupported payment network: ${network}`);
  return rail;
}

export function listRails(): PaymentRail[] { return Object.values(PAYMENT_RAILS); }

export interface PaywallOptions {
  amount: number;
  recipient: string;
  /** Defaults to Robinhood/USDG. Opt into Base, Arbitrum, or Polygon explicitly. */
  network?: PaymentNetwork;
  rpcUrl?: string;
  replayStore?: ReplayStore;
  realm?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

export interface Challenge {
  nonce: string;
  amount: number;
  token: string;
  tokenContract: Address;
  network: PaymentNetwork;
  chainId: number;
  recipient: string;
  memo: string;
}

export function defaultRpcUrl(network: PaymentNetwork | string): string { return getRail(network).defaultRpcUrl; }

export function buildChallenge(opts: PaywallOptions, realm: string, network: PaymentNetwork): Challenge {
  const rail = getRail(network);
  const nonce = randomBytes(16).toString("hex");
  return { nonce, amount: opts.amount, token: rail.asset, tokenContract: rail.tokenContract, network, chainId: rail.chainId, recipient: opts.recipient, memo: `${realm}:${nonce}` };
}

export function challengeHeaders(challenge: Challenge, realm: string): Record<string, string> {
  return {
    "WWW-Authenticate": `x402 realm="${realm}", nonce="${challenge.nonce}", amount="${challenge.amount}", recipient="${challenge.recipient}", network="${challenge.network}"`,
    "X-Pay-Token": challenge.token,
    "X-Pay-Network": challenge.network,
    "X-Pay-Chain-Id": String(challenge.chainId),
    "X-Pay-Amount": String(challenge.amount),
    "X-Pay-Recipient": challenge.recipient,
    "X-Pay-Nonce": challenge.nonce,
  };
}

export type PaymentOutcome =
  | { kind: "challenge"; challenge: Challenge; headers: Record<string, string> }
  | { kind: "nonce_required" }
  | { kind: "replayed" }
  | { kind: "invalid" }
  | { kind: "unlocked"; rail: PaymentRail }
  | { kind: "error"; detail: string };

interface VerifyArgs { client: ReturnType<typeof createPublicClient>; tx: Hash; recipient: string; amount: number; rail: PaymentRail; }

export async function verifyStablecoinTransfer({ client, tx, recipient, amount, rail }: VerifyArgs): Promise<boolean> {
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

export async function evaluatePayment(opts: PaywallOptions, tx: string | undefined | null, nonce: string | undefined | null): Promise<PaymentOutcome> {
  const network = opts.network || "robinhood-mainnet";
  const rail = getRail(network);
  const realm = opts.realm || "verge";
  if (!tx) {
    const challenge = buildChallenge(opts, realm, network);
    return { kind: "challenge", challenge, headers: challengeHeaders(challenge, realm) };
  }
  try {
    if (!nonce) return { kind: "nonce_required" };
    const replayKey = `${network}:${tx.toLowerCase()}`;
    const alreadyUsed = opts.replayStore ? await opts.replayStore.has(replayKey) : memoryReplayStore.has(replayKey);
    if (alreadyUsed) return { kind: "replayed" };
    const client = createPublicClient({ chain: rail.chain, transport: http(opts.rpcUrl || rail.defaultRpcUrl) });
    const ok = await verifyStablecoinTransfer({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, rail });
    if (!ok) return { kind: "invalid" };
    if (opts.replayStore) await opts.replayStore.add(replayKey); else memoryReplayStore.add(replayKey);
    return { kind: "unlocked", rail };
  } catch (e) { return { kind: "error", detail: String(e instanceof Error ? e.message : e) }; }
}

const memoryReplayStore = new Set<string>();
