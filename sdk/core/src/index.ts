// @vergex402/core — shared HTTP 402 / USDG payment verification logic for Robinhood Chain.
// Framework adapters (@vergex402/express, @vergex402/hono) wrap this — no Express or Hono
// dependency lives here, so it stays usable in any JS runtime (Node, Bun, Workers).

import { randomBytes } from "node:crypto";
import { createPublicClient, defineChain, http, parseUnits, type Address, type Hash } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Chain Explorer", url: "https://robinhoodchain.blockscout.com" } },
});

/** USDG on Robinhood Chain (6 decimals) */
export const USDG_MAINNET = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;

/** ERC-20 Transfer(address,address,uint256) topic */
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface PaywallOptions {
  /** Price in USDG (e.g. 0.001 = $0.001) */
  amount: number;
  /** Robinhood Chain address that receives the payment (0x…) */
  recipient: string;
  /** Network: robinhood-mainnet */
  network?: "robinhood-mainnet";
  /** RPC endpoint. Defaults to the public Robinhood Chain RPC. */
  rpcUrl?: string;
  /** Durable replay store. Use Redis/SQLite/Postgres in multi-instance production. */
  replayStore?: ReplayStore;
  /** Realm name advertised in WWW-Authenticate */
  realm?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

export interface Challenge {
  nonce: string;
  amount: number;
  token: "USDG";
  tokenContract: Address;
  network: string;
  recipient: string;
  memo: string;
}

export function defaultRpcUrl(network: string): string {
  if (network !== "robinhood-mainnet") throw new Error(`Unsupported network: ${network}`);
  return process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
}

export function buildChallenge(opts: PaywallOptions, realm: string, network: string): Challenge {
  const nonce = randomBytes(6).toString("hex");
  return { nonce, amount: opts.amount, token: "USDG", tokenContract: USDG_MAINNET, network, recipient: opts.recipient, memo: `${realm}:${nonce}` };
}

export function challengeHeaders(challenge: Challenge, network: string, realm: string, recipient: string, amount: number): Record<string, string> {
  return {
    "WWW-Authenticate": `x402 realm="${realm}", nonce="${challenge.nonce}", amount="${amount}", recipient="${recipient}", network="${network}"`,
    "X-Pay-Token": "USDG",
    "X-Pay-Network": network,
    "X-Pay-Amount": String(amount),
    "X-Pay-Recipient": recipient,
    "X-Pay-Nonce": challenge.nonce,
  };
}

export type PaymentOutcome =
  | { kind: "challenge"; challenge: Challenge; headers: Record<string, string> }
  | { kind: "nonce_required" }
  | { kind: "replayed" }
  | { kind: "invalid" }
  | { kind: "unlocked" }
  | { kind: "error"; detail: string };

interface VerifyArgs {
  client: ReturnType<typeof createPublicClient>;
  tx: Hash;
  recipient: string;
  amount: number;
  usdgAddress: Address;
}

export async function verifyUsdgTransfer({ client, tx, recipient, amount, usdgAddress }: VerifyArgs): Promise<boolean> {
  if (!tx || tx.length < 66) return false;

  const receipt = await client.getTransactionReceipt({ hash: tx });
  if (!receipt || receipt.status !== "success") return false;

  const amountRaw = parseUnits(String(amount), 6);
  const recipientLower = recipient.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdgAddress.toLowerCase() || log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const toAddr = ("0x" + toTopic.slice(26)).toLowerCase();
    if (toAddr !== recipientLower) continue;
    if (BigInt(log.data) >= amountRaw) return true;
  }
  return false;
}

/**
 * Runs the full x402 payment decision for a single request: issue a challenge when no
 * payment header is present, or verify + record a replay-safe transaction when one is.
 * Framework adapters call this and translate the outcome into their own response type.
 */
export async function evaluatePayment(opts: PaywallOptions, tx: string | undefined | null, nonce: string | undefined | null): Promise<PaymentOutcome> {
  const network = opts.network || "robinhood-mainnet";
  const rpcUrl = opts.rpcUrl || defaultRpcUrl(network);
  const realm = opts.realm || "verge";

  if (!tx) {
    const challenge = buildChallenge(opts, realm, network);
    return { kind: "challenge", challenge, headers: challengeHeaders(challenge, network, realm, opts.recipient, opts.amount) };
  }

  try {
    if (!nonce) return { kind: "nonce_required" };

    const alreadyUsed = opts.replayStore ? await opts.replayStore.has(tx) : memoryReplayStore.has(tx);
    if (alreadyUsed) return { kind: "replayed" };

    const client = createPublicClient({ chain: robinhoodChain, transport: http(rpcUrl) });
    const ok = await verifyUsdgTransfer({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, usdgAddress: USDG_MAINNET });
    if (!ok) return { kind: "invalid" };

    if (opts.replayStore) await opts.replayStore.add(tx);
    else memoryReplayStore.add(tx);
    return { kind: "unlocked" };
  } catch (e) {
    return { kind: "error", detail: String(e instanceof Error ? e.message : e) };
  }
}

// Process-local fallback replay guard. Pass `replayStore` for multi-instance deployments.
const memoryReplayStore = new Set<string>();
