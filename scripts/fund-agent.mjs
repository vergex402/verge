import { createPublicClient, createWalletClient, http, encodeFunctionData, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const chain = { id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const treasury = privateKeyToAccount("0xc6c4edf3ad95de4f9ce3526d825ee5eb502e209ec3918df6b52b990eb9f7532c");
const client = createWalletClient({ account: treasury, chain, transport: http(RPC, { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0" } } }) });
const pub = createPublicClient({ transport: http(RPC, { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0" } } }) });

const agentAddr = "0x82Ff17d486261f2D0937429BAB85ad993b4f5330";
const gasPrice = await pub.getGasPrice();
const safeGas = (gasPrice * 150n) / 100n;

// 1. Gas funding: 0.0004 ETH (plenty at 0.026 gwei). RH Chain minimum gas price is ~0.1 gwei.
const h1 = await client.sendTransaction({ to: agentAddr, value: 400000000000000n, gasPrice: safeGas > 100000000n ? safeGas : 100000000n, gas: 105000n });
let r = await pub.waitForTransactionReceipt({ hash: h1, timeoutMs: 60000 });
console.log("gas tx:", h1, r.status);

// 2. USDG funding: treasury has 0 — swap 0.0012 ETH -> USDG via router (wallet1 as recipient? swap outputs to treasury then transfer)
// Simpler: swap 0.0015 ETH -> USDG (treasury receives), then transfer 0.002 USDG to agent
const ROUTER = "0xcaf681a66d020601342297493863e78c959e5cb2";
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const fee = 500n;
const amountIn = 1500000000000000n; // 0.0015 ETH
const amountOutMinimum = 2500000n; // 2.5 USDG min slippage guard (quote was ~2.675/0.001 ETH)
// exactInputSingle params: tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96
const params = { tokenIn: WETH, tokenOut: USDG, fee, recipient: treasury.address, amountIn, amountOutMinimum, sqrtPriceLimitX96: 0n };
const data = encodeFunctionData({
  abi: [{ name: "exactInputSingle", type: "function", inputs: [{ name: "p", type: "tuple", components: [
    { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" },
    { name: "recipient", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" },
    { name: "sqrtPriceLimitX96", type: "uint160" } ] }], outputs: [{ type: "uint256" }], stateMutability: "payable" }],
  functionName: "exactInputSingle", args: [params],
});
const h2 = await client.sendTransaction({ to: ROUTER, data, value: amountIn, gasPrice: safeGas, gas: 300000n });
r = await pub.waitForTransactionReceipt({ hash: h2, timeoutMs: 90000 });
console.log("swap tx:", h2, r.status);

// 3. Transfer USDG to agent
const usdgData = encodeFunctionData({
  abi: [{ name: "transfer", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }],
  functionName: "transfer", args: [agentAddr, 3000000n],
});
const h3 = await client.sendTransaction({ to: USDG, data: usdgData, gasPrice: safeGas, gas: 100000n });
r = await pub.waitForTransactionReceipt({ hash: h3, timeoutMs: 60000 });
console.log("usdg transfer:", h3, r.status);
