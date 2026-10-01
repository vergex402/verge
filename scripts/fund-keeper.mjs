// One-off: fund the anchor keeper (treasury) with gas from swap wallet #1.
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const chain = { id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const wallets = JSON.parse(readFileSync("/root/wallets_robinhood/web3_wallets_5.json", "utf8"));
const entry = wallets.find((w) => w.address.toLowerCase() === "0x82ff17d486261f2d0937429bab85ad993b4f5330");
const key = entry.private_key.startsWith("0x") ? entry.private_key : `0x${entry.private_key}`;
const from = privateKeyToAccount(key);
const client = createWalletClient({ account: from, chain, transport: http(RPC, { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0" } } }) });
const pub = createPublicClient({ transport: http(RPC, { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0" } } }) });

const gasPrice = await pub.getGasPrice();
const safeGas = gasPrice > 100000000n ? (gasPrice * 150n) / 100n : 100000000n;
const hash = await client.sendTransaction({ to: "0xBCDcB0A6b7493feF8863597D373665BeCb4C6546", value: 200000000000000n, gasPrice: safeGas, gas: 105000n });
const r = await pub.waitForTransactionReceipt({ hash, timeoutMs: 60000 });
console.log("keeper funding tx:", hash, r.status);
