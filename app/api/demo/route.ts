// Real USDG payment demo on Robinhood Chain.
//
// First call returns HTTP 402 with a challenge.
// Replay with X-Pay-Tx + X-Pay-Nonce verifies the receipt on-chain.

import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { checkApiKey } from "@/app/lib/api-key";
import { robinhoodRpc } from "@/app/lib/robinhood-rpc";

export const runtime = "nodejs";

const PRICE_USDG = 0.001;
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168".toLowerCase();
const RECIPIENT = (process.env.DEMO_MERCHANT_WALLET || "").toLowerCase();
const NETWORK = "robinhood-mainnet";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const usedTransactions = new Set<string>();

function validAddress(value: string) {
  return /^0x[a-f0-9]{40}$/.test(value);
}

function validHash(value: string) {
  return /^0x[a-f0-9]{64}$/i.test(value);
}

async function verifyPayment(txHash: string) {
  if (!validAddress(RECIPIENT)) return { ok: false, reason: "DEMO_MERCHANT_WALLET is not configured" };
  const receipt: any = await robinhoodRpc("eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1") return { ok: false, reason: "transaction not successful" };

  const minimum = BigInt(Math.round(PRICE_USDG * 1_000_000));
  for (const log of receipt.logs || []) {
    if (String(log.address).toLowerCase() !== USDG) continue;
    if (String(log.topics?.[0]).toLowerCase() !== TRANSFER_TOPIC) continue;
    if (!log.topics?.[2] || !log.data) continue;
    const to = `0x${String(log.topics[2]).slice(-40)}`.toLowerCase();
    if (to !== RECIPIENT) continue;
    if (BigInt(log.data) >= minimum) return { ok: true };
  }
  return { ok: false, reason: "no matching USDG transfer to merchant" };
}

export async function GET(req: NextRequest) {
  const tx = req.headers.get("x-pay-tx") || "";
  const nonce = req.headers.get("x-pay-nonce") || "";
  const apiKey = req.headers.get("x-api-key");

  // An API key bypasses per-call USDG payment but is quota-metered per wallet.
  if (apiKey) {
    const check = await checkApiKey(apiKey);
    if (!check.ok) {
      const status = check.error === "QUOTA_EXCEEDED" ? 429 : 401;
      return Response.json({ error: "API key rejected", code: check.error }, { status });
    }
    return Response.json({
      ok: true,
      network: NETWORK,
      auth: "api-key",
      wallet: check.wallet,
      quota: { remaining: check.remaining, limit: check.limit },
      payload: { message: "Authorized via metered API key. Premium endpoint unlocked." },
    }, { headers: { "X-RateLimit-Remaining": String(check.remaining), "X-RateLimit-Limit": String(check.limit) } });
  }

  if (tx) {
    if (!validHash(tx)) {
      return Response.json({ error: "Invalid tx signature", code: "TX_INVALID" }, { status: 402 });
    }
    if (!nonce) return Response.json({ error: "Payment nonce required", code: "NONCE_REQUIRED" }, { status: 402 });
    if (usedTransactions.has(tx.toLowerCase())) return Response.json({ error: "Transaction already used", code: "TX_REPLAYED" }, { status: 402 });
    try {
      const result = await verifyPayment(tx);
      if (!result.ok) {
        return Response.json({ error: "Payment verification failed", code: "TX_NOT_PAID", detail: result.reason }, { status: 402 });
      }
      usedTransactions.add(tx.toLowerCase());
      return Response.json({
        ok: true,
        network: NETWORK,
        token: "USDG",
        unlocked_at: new Date().toISOString(),
        payload: { message: "Payment verified on-chain. Premium endpoint unlocked.", tx, nonce },
      });
    } catch (error) {
      return Response.json({ error: "Payment verifier unavailable", code: "TX_RPC_ERROR", detail: String(error) }, { status: 503 });
    }
  }

  const challengeNonce = randomBytes(6).toString("hex");
  return new Response(JSON.stringify({
    error: "Payment required",
    code: "PAYMENT_REQUIRED",
    challenge: { nonce: challengeNonce, amount: PRICE_USDG, token: "USDG", network: NETWORK, recipient: RECIPIENT || null, memo: `verge:${challengeNonce}` },
    retry: { method: "GET", url: "/api/demo", headers_required: ["x-pay-tx", "x-pay-nonce"] },
  }), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `x402 realm="verge", nonce="${challengeNonce}", amount="${PRICE_USDG}", recipient="${RECIPIENT || "unset"}", network="${NETWORK}"`,
      "X-Pay-Token": "USDG",
      "X-Pay-Network": NETWORK,
      "X-Pay-Amount": String(PRICE_USDG),
      "X-Pay-Recipient": RECIPIENT,
      "X-Pay-Nonce": challengeNonce,
    },
  });
}
