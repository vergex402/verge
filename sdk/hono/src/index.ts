// @vergex402/hono — Hono middleware for HTTP 402 micropayments on Robinhood Chain.
//
// Usage:
//
//   import { Hono } from "hono";
//   import { paywall } from "@vergex402/hono";
//
//   const app = new Hono();
//   app.use("/api/premium", paywall({
//     amount: 0.001,
//     recipient: process.env.WALLET!,
//     network: "robinhood-mainnet",
//   }));

import { randomBytes } from "node:crypto";
import { createPublicClient, defineChain, http, parseUnits, type Address, type Hash } from "viem";

const memoryReplayStore = new Set<string>();

const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Chain Explorer", url: "https://robinhoodchain.blockscout.com" } },
});

export interface PaywallOptions {
  amount: number;
  recipient: string;
  network?: "robinhood-mainnet";
  rpcUrl?: string;
  replayStore?: ReplayStore;
  realm?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

const USDG_MAINNET = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function defaultRpcUrl(network: string): string {
  if (network !== "robinhood-mainnet") throw new Error(`Unsupported network: ${network}`);
  return process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
}

// Minimal structural types so this package has no hard dependency on `hono`.
interface HonoLikeContext {
  req: { header(name: string): string | undefined };
  json(body: unknown, status?: number): unknown;
  header(name: string, value: string): void;
}
type HonoLikeNext = () => Promise<void>;
type HonoLikeHandler = (c: HonoLikeContext, next: HonoLikeNext) => Promise<unknown>;

export function paywall(opts: PaywallOptions): HonoLikeHandler {
  const network = opts.network || "robinhood-mainnet";
  const rpcUrl = opts.rpcUrl || defaultRpcUrl(network);
  const realm = opts.realm || "verge";
  const client = createPublicClient({ chain: robinhood, transport: http(rpcUrl) });

  return async (c, next) => {
    const tx = c.req.header("x-pay-tx");
    const nonce = c.req.header("x-pay-nonce") || "";

    if (!tx) {
      const challengeNonce = randomBytes(6).toString("hex");
      c.header("WWW-Authenticate", `x402 realm="${realm}", nonce="${challengeNonce}", amount="${opts.amount}", recipient="${opts.recipient}", network="${network}"`);
      c.header("X-Pay-Token", "USDG");
      c.header("X-Pay-Network", network);
      c.header("X-Pay-Amount", String(opts.amount));
      c.header("X-Pay-Recipient", opts.recipient);
      c.header("X-Pay-Nonce", challengeNonce);
      return c.json({
        error: "Payment required", code: "PAYMENT_REQUIRED",
        challenge: { nonce: challengeNonce, amount: opts.amount, token: "USDG", tokenContract: USDG_MAINNET, network, recipient: opts.recipient, memo: `${realm}:${challengeNonce}` },
      }, 402);
    }

    try {
      if (!nonce) return c.json({ error: "Payment nonce required", code: "NONCE_REQUIRED" }, 402);
      const alreadyUsed = opts.replayStore ? await opts.replayStore.has(tx) : memoryReplayStore.has(tx);
      if (alreadyUsed) return c.json({ error: "Transaction already used", code: "TX_REPLAYED" }, 402);

      const ok = await defaultVerify({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, usdgAddress: USDG_MAINNET });
      if (!ok) return c.json({ error: "Tx verification failed", code: "TX_INVALID" }, 402);

      if (opts.replayStore) await opts.replayStore.add(tx);
      else memoryReplayStore.add(tx);
      await next();
    } catch (e) {
      return c.json({ error: "Verification error", code: "TX_ERROR", detail: String(e instanceof Error ? e.message : e) }, 402);
    }
  };
}

interface VerifyArgs {
  client: ReturnType<typeof createPublicClient>;
  tx: Hash;
  recipient: string;
  amount: number;
  usdgAddress: Address;
}

async function defaultVerify({ client, tx, recipient, amount, usdgAddress }: VerifyArgs): Promise<boolean> {
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
