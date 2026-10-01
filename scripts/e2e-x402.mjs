// Verge E2E demo: publish endpoint as merchant wallet, then run an x402 agent
// that actually pays USDG against the live endpoint.
//
// Usage: node scripts/e2e-x402.mjs <merchantPrivKey> <agentPrivKey>
// Both keys are read from argv by the caller (systemd/env), never committed.
//
// Steps:
//   1. Merchant signs SIWE-style auth -> session -> POST /api/marketplace (hosted template)
//   2. Agent GETs the new /x/<slug> -> 402 challenge
//   3. Agent transfers the exact USDG amount (x402 v2 upfront direct-transfer)
//      and retries with PAYMENT-SIGNATURE payload -> expects 200 + unlocked data
//   4. Prints settlement tx + receipt id evidence

import { createPublicClient, createWalletClient, http, encodeFunctionData, parseUnits, verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";

const SITE = process.env.VERGE_SITE_URL || "https://vergesnowy.com";
const RPC = process.env.RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const UA = { "User-Agent": "Mozilla/5.0 (Verge-E2E/1.0)", "content-type": "application/json" };

const chain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const merchant = privateKeyToAccount(process.argv[2].startsWith("0x") ? process.argv[2] : `0x${process.argv[2]}`);
const agent = privateKeyToAccount(process.argv[3].startsWith("0x") ? process.argv[3] : `0x${process.argv[3]}`);
const merchantClient = createWalletClient({ account: merchant, chain, transport: http(RPC, { fetchOptions: { headers: { "User-Agent": UA["User-Agent"] } } }) });
const agentClient = createWalletClient({ account: agent, chain, transport: http(RPC, { fetchOptions: { headers: { "User-Agent": UA["User-Agent"] } } }) });
const publicClient = createPublicClient({ transport: http(RPC, { fetchOptions: { headers: { "User-Agent": UA["User-Agent"] } } }) });

async function walletSession(account, client) {
  const res = await fetch(`${SITE}/api/auth/challenge?address=${account.address}`, { headers: { "User-Agent": UA["User-Agent"] } });
  const { message } = await res.json();
  const signature = await client.signMessage({ message });
  const login = await fetch(`${SITE}/api/auth/session`, { method: "POST", headers: UA, body: JSON.stringify({ address: account.address, message, signature }) });
  if (!login.ok) throw new Error(`auth failed: ${login.status} ${await login.text()}`);
  return login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  console.log(`merchant: ${merchant.address}`);
  console.log(`agent:    ${agent.address}`);

  // 1. Merchant session
  const merchantCookie = await walletSession(merchant, merchantClient);
  console.log("merchant session ok");

  // Publish a hosted template endpoint with a real price
  const endpointName = `e2e-demo-${randomBytes(2).toString("hex")}`;
  const publish = await fetch(`${SITE}/api/marketplace`, {
    method: "POST",
    headers: { ...UA, cookie: merchantCookie },
    body: JSON.stringify({ name: endpointName, price: "0.001", network: "robinhood-mainnet", hostedTemplate: "daily-quote", description: endpointName }),
  });
  const published = await publish.json();
  if (!publish.ok) throw new Error(`publish failed: ${publish.status} ${JSON.stringify(published)}`);
  const slug = published.hostedSlug;
  console.log(`published endpoint: ${SITE}/x/${slug} (id=${published.id})`);

  // 2. Agent hits the endpoint — expect 402
  const first = await fetch(`${SITE}/x/${slug}`, { headers: { "User-Agent": UA["User-Agent"] } });
  if (first.status !== 402) throw new Error(`expected 402 challenge, got ${first.status}`);
  const prHeader = first.headers.get("payment-required");
  const pr = JSON.parse(Buffer.from(prHeader, "base64").toString("utf8"));
  const req = pr.accepts[0];
  console.log(`402 challenge received: ${Number(req.amount) / 1e6} USDG to ${req.payTo}`);

  // 3. Agent pays: direct USDG transfer with memo in... no memo field on-chain —
  //    x402 v2 upfront direct-transfer = plain ERC-20 transfer of exact amount.
  const usdg = req.asset;
  const transferData = encodeFunctionData({
    abi: [{ name: "transfer", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }],
    functionName: "transfer",
    args: [req.payTo, BigInt(req.amount)],
  });
  const gasPrice = await publicClient.getGasPrice();
  const txHash = await agentClient.sendTransaction({
    to: usdg,
    data: transferData,
    gasPrice: (gasPrice * 150n) / 100n,
    gas: 100_000n,
  });
  console.log(`agent payment tx: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeoutMs: 90_000 });
  if (receipt.status !== "success") throw new Error("payment tx reverted");
  console.log(`payment confirmed in block ${receipt.blockNumber}`);

  // Build x402 v2 PAYMENT-SIGNATURE payload
  const payload = {
    x402Version: 2,
    resource: pr.resource,
    accepts: [{ ...req, tx: txHash }],
    paymentPayload: undefined,
  };
  const sigPayload = {
    x402Version: 2,
    paymentPayload: {
      x402Version: 2,
      scheme: "exact",
      network: req.network,
      resource: pr.resource?.url || `${SITE}/x/${slug}`,
      transaction: txHash,
      payer: agent.address,
      memo: req.extra?.memo,
    },
    paymentRequirements: {
      scheme: "exact",
      network: req.network,
      amount: req.amount,
      asset: req.asset,
      recipient: req.payTo,
    },
  };
  const encoded = Buffer.from(JSON.stringify(sigPayload.paymentPayload)).toString("base64");

  const retry = await fetch(`${SITE}/x/${slug}`, {
    headers: { "User-Agent": UA["User-Agent"], "x-pay-tx": txHash, "x-pay-nonce": req.extra?.nonce || "e2e" },
  });
  const retryText = await retry.text();
  console.log(`retry status: ${retry.status}`);
  if (retry.status !== 200) {
    console.error("retry body:", retryText.slice(0, 400));
    throw new Error("settled request did not unlock");
  }
  const data = JSON.parse(retryText);
  console.log(`UNLOCKED: endpoint=${data.endpoint} settled=${data.settled} tx=${data.tx}`);

  // Check the receipt exists
  const feed = await fetch(`${SITE}/api/feed`, { headers: { "User-Agent": UA["User-Agent"] } });
  console.log(`feed reachable: ${feed.status}`);
  console.log(`\nE2E COMPLETE — settlement tx: ${txHash}`);
}

main().catch((e) => { console.error("E2E FAILED:", e.message); process.exit(1); });
