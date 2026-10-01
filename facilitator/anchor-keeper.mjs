// Verge proof-anchor keeper — commits the latest Merkle batch root on-chain.
//
// Usage:
//   node facilitator/anchor-keeper.mjs once          # anchor unanchored batches, exit
//   node facilitator/anchor-keeper.mjs loop [intervalSec]
//
// Reads VERGE_KEEPER_PRIVATE_KEY + RH_RPC_URL from the environment (systemd
// drop-in or shell). The keeper wallet needs a small ETH gas balance on 4663.
// Anchors are data-only transactions (hex Merkle root as input data) — no
// contract deployment, nothing to exploit, root recoverable from any tx.

import { createPublicClient, createWalletClient, http, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const RPC = process.env.RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = 4663;
const SITE = process.env.VERGE_SITE_URL || "https://vergesnowy.com";
const UA = { "User-Agent": "Mozilla/5.0 (Verge-AnchorKeeper/1.0)" };

const key = process.env.VERGE_KEEPER_PRIVATE_KEY;
if (!key) { console.error("VERGE_KEEPER_PRIVATE_KEY is required"); process.exit(1); }

const chain = {
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const publicClient = createPublicClient({ transport: http(RPC, { fetchOptions: { headers: UA } }) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC, { fetchOptions: { headers: UA } }) });

async function api(path, init = {}) {
  const res = await fetch(`${SITE}${path}`, { ...init, headers: { ...UA, ...(init.headers || {}) } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`non-JSON ${res.status}: ${text.slice(0, 120)}`); }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error || text.slice(0, 120)}`);
  return json;
}

async function anchorBatch(batch) {
  const root = batch.merkleRoot.startsWith("0x") ? batch.merkleRoot : `0x${batch.merkleRoot}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(root)) throw new Error(`bad merkle root: ${batch.merkleRoot}`);
  const data = toHex(new TextEncoder().encode(`verge-proof-anchor:${batch.batchId}:${root}`));
  const gasPrice = await publicClient.getGasPrice();
  const safeGas = gasPrice > 100000000n ? (gasPrice * 150n) / 100n : 100000000n;
  const hash = await walletClient.sendTransaction({ to: account.address, data, gasPrice: safeGas, gas: 200_000n });
  console.log(`[${batch.batchId}] anchor tx broadcast: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeoutMs: 90_000 });
  if (receipt.status !== "success") throw new Error(`anchor tx reverted: ${hash}`);
  console.log(`[${batch.batchId}] anchored in block ${receipt.blockNumber}`);
  return hash;
}

async function tick() {
  const latest = await api("/api/proofs?latest=true").catch((e) => (e.message.includes("No batches") ? null : Promise.reject(e)));
  if (!latest) { console.log("no batches yet"); return; }
  if (latest.anchor?.tx) { console.log(`latest batch ${latest.batchId} already anchored: ${latest.anchor.tx}`); return; }
  // Fetch full batch info (root + range) then anchor it.
  const info = await api(`/api/proofs?batch=${latest.batchId}`);
  const hash = await anchorBatch(info);
  await fetch(`${SITE}/api/proofs/anchor`, {
    method: "POST",
    headers: { ...UA, "content-type": "application/json", "x-anchor-secret": process.env.VERGE_ANCHOR_SECRET || "" },
    body: JSON.stringify({ batchId: info.batchId, merkleRoot: info.merkleRoot, tx: hash, wallet: account.address, chainId: CHAIN_ID }),
  }).then(async (r) => { if (!r.ok) throw new Error(`anchor persist failed: HTTP ${r.status} ${await r.text()}`); });
  console.log(`[${info.batchId}] anchor persisted`);
}

const mode = process.argv[2] || "once";
if (mode === "loop") {
  const interval = Number(process.argv[3] || 300) * 1000;
  for (;;) {
    try { await tick(); } catch (e) { console.error(`tick failed: ${e.message}`); }
    await new Promise((r) => setTimeout(r, interval));
  }
} else {
  await tick();
}
