// @vergex402/express — Express middleware for HTTP 402 micropayments on Robinhood Chain.
//
// Usage:
//
//   import { paywall } from "@vergex402/express";
//
//   app.use("/api/premium", paywall({
//     amount: 0.001,
//     recipient: process.env.WALLET!,
//     network: "robinhood-mainnet",
//   }));
//
// On first request, returns 402 with a signed challenge.
// On replay with X-Pay-Tx header, verifies the tx on Robinhood Chain and unlocks.

import type { Request, Response, NextFunction, RequestHandler } from "express";
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
  /** Price in USDG (e.g. 0.001 = $0.001) */
  amount: number;
  /** Robinhood Chain address that receives the payment (0x…) */
  recipient: string;
  /** Network: robinhood-mainnet */
  network?: "robinhood-mainnet";
  /** RPC endpoint. Defaults to the public Robinhood Chain RPC. */
  rpcUrl?: string;
  /** Custom verifier — return true to unlock. Overrides default on-chain verification. */
  verify?: (req: Request, tx: string, nonce: string) => Promise<boolean> | boolean;
  /** Durable replay store. Use Redis/SQLite/Postgres in multi-instance production. */
  replayStore?: ReplayStore;
  /** Realm name advertised in WWW-Authenticate */
  realm?: string;
}

export interface ReplayStore {
  has(txHash: string): Promise<boolean> | boolean;
  add(txHash: string): Promise<void> | void;
}

// USDG on Robinhood Chain (6 decimals)
const USDG_MAINNET = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;

// ERC-20 Transfer(address,address,uint256) topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function defaultRpcUrl(network: string): string {
  if (network !== "robinhood-mainnet") throw new Error(`Unsupported network: ${network}`);
  return process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
}

export function paywall(opts: PaywallOptions): RequestHandler {
  const network = opts.network || "robinhood-mainnet";
  const usdgAddress = USDG_MAINNET;
  const rpcUrl = opts.rpcUrl || defaultRpcUrl(network);
  const realm = opts.realm || "verge";

  const client = createPublicClient({
    chain: robinhood,
    transport: http(rpcUrl),
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const tx = req.header("x-pay-tx");
    const nonce = req.header("x-pay-nonce") || "";

    // No payment header — issue challenge
    if (!tx) {
      const challengeNonce = randomBytes(6).toString("hex");
      res.status(402);
      res.set({
        "WWW-Authenticate": `x402 realm="${realm}", nonce="${challengeNonce}", amount="${opts.amount}", recipient="${opts.recipient}", network="${network}"`,
        "X-Pay-Token": "USDG",
        "X-Pay-Network": network,
        "X-Pay-Amount": String(opts.amount),
        "X-Pay-Recipient": opts.recipient,
        "X-Pay-Nonce": challengeNonce,
      });
      res.json({
        error: "Payment required",
        code: "PAYMENT_REQUIRED",
        challenge: {
          nonce: challengeNonce,
          amount: opts.amount,
          token: "USDG",
          tokenContract: usdgAddress,
          network,
          recipient: opts.recipient,
          memo: `${realm}:${challengeNonce}`,
        },
      });
      return;
    }

    // Replay — verify on-chain
    try {
      if (!nonce) {
        res.status(402).json({ error: "Payment nonce required", code: "NONCE_REQUIRED" });
        return;
      }
      const alreadyUsed = opts.replayStore ? await opts.replayStore.has(tx) : memoryReplayStore.has(tx);
      if (alreadyUsed) {
        res.status(402).json({ error: "Transaction already used", code: "TX_REPLAYED" });
        return;
      }
      const ok = opts.verify
        ? await opts.verify(req, tx, nonce)
        : await defaultVerify({ client, tx: tx as Hash, recipient: opts.recipient, amount: opts.amount, usdgAddress });
      if (!ok) {
        res.status(402).json({ error: "Tx verification failed", code: "TX_INVALID" });
        return;
      }
      if (opts.replayStore) await opts.replayStore.add(tx);
      else memoryReplayStore.add(tx);
      next();
    } catch (e: any) {
      res.status(402).json({ error: "Verification error", code: "TX_ERROR", detail: String(e?.message || e) });
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

  // USDG has 6 decimals
  const amountRaw = parseUnits(String(amount), 6);
  const recipientLower = recipient.toLowerCase();

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== usdgAddress.toLowerCase() ||
      log.topics[0] !== TRANSFER_TOPIC ||
      log.topics.length < 3
    ) continue;

    // topics[2] = "to" address (padded to 32 bytes)
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const toAddr = ("0x" + toTopic.slice(26)).toLowerCase();
    if (toAddr !== recipientLower) continue;

    const value = BigInt(log.data);
    if (value >= amountRaw) return true;
  }
  return false;
}

export type { Request, Response, NextFunction } from "express";
