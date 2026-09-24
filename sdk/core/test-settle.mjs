// Positive-path test for settleX402Payment (run: node test-settle.mjs):
// mock JSON-RPC server returns a fabricated successful USDG Transfer receipt;
// the REAL built core (dist/index.js) is exercised end-to-end:
// challenge → PAYMENT-REQUIRED header shape → settle → replay block → nonce-reuse block.
import { createServer } from "node:http";
import { settleX402Payment, decodePaymentRequired, evaluatePayment } from "./dist/index.js";

const MERCHANT = "0x8b5a888a0c046916d1741a89583660a0810aa37f";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const PAYER = "0x6c0927d23e562bf917ac4744fe789c41815b2b1b";
const TX = "0x" + "be".repeat(32);
const pad = (a) => "0x" + a.toLowerCase().replace(/^0x/, "").padStart(64, "0");

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("content-type", "application/json");
    const parsed = JSON.parse(body);
    const calls = Array.isArray(parsed) ? parsed : [parsed];
    for (const { id, method, params } of calls) {
      if (method === "eth_getTransactionReceipt") {
        const receipt = {
          transactionHash: params[0], transactionIndex: "0x0",
          blockHash: "0x" + "11".repeat(32), blockNumber: "0x1", status: "0x1",
          logs: [{
            address: USDG,
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", pad(PAYER), pad(MERCHANT)],
            data: "0x3e8",
            blockNumber: "0x1", blockHash: "0x" + "11".repeat(32),
            transactionHash: params[0], transactionIndex: "0x0", logIndex: "0x0", removed: false,
          }],
        };
        res.write(JSON.stringify({ jsonrpc: "2.0", id, result: receipt }));
      } else {
        res.write(JSON.stringify({ jsonrpc: "2.0", id, error: { message: "unexpected " + method } }));
      }
    }
    res.end();
  });
});
await new Promise((r) => server.listen(18599, "127.0.0.1", r));
console.log("mock up on 18599");

const RPC = "http://127.0.0.1:18599";
const opts = { amount: 0.001, recipient: MERCHANT, network: "robinhood-mainnet", rpcUrl: RPC, realm: "test" };
const first = await evaluatePayment(opts, null, null, { url: "http://x/t" });
const pr = decodePaymentRequired(first.headers["PAYMENT-REQUIRED"]);
const nonce = first.challenge.nonce;
const payload = { x402Version: 2, accepted: pr.accepts[0], payload: { tx: TX, nonce } };

console.log("--- settle #1 ---");
const result = await settleX402Payment({ rpcUrl: RPC }, payload, pr.accepts[0]);
console.log("settle:", JSON.stringify(result));
if (!result.success || result.payer !== PAYER) { server.close(); process.exit(1); }

console.log("--- settle #2 (replay) ---");
const replay = await settleX402Payment({ rpcUrl: RPC }, payload, pr.accepts[0]);
console.log("replay:", JSON.stringify(replay));
if (replay.success || replay.errorReason !== "transaction_already_settled") { server.close(); process.exit(1); }

console.log("--- settle #3 (nonce reuse, fresh tx) ---");
const fresh = { ...payload, payload: { tx: "0x" + "ce".repeat(32), nonce } };
const nonceReplay = await settleX402Payment({ rpcUrl: RPC }, fresh, pr.accepts[0]);
console.log("nonce reuse:", JSON.stringify(nonceReplay));
if (nonceReplay.success || nonceReplay.errorReason !== "nonce_unknown_or_expired") { server.close(); process.exit(1); }

server.close();
console.log("\nALL POSITIVE-PATH TESTS PASSED");
process.exit(0);
