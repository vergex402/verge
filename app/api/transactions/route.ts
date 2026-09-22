import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";

export const runtime = "nodejs";
const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Verge/1.0" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store" });
  if (!r.ok) throw new Error(`RPC ${r.status}`);
  const body = await r.json();
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result;
}

function padAddress(address: string) { return `0x${address.slice(2).padStart(64, "0")}`; }

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const wallet = sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const latest = parseInt(await rpc("eth_blockNumber", []), 16);
    const fromBlock = Math.max(0, latest - Number(process.env.ROBINHOOD_SCAN_BLOCKS || 2000));
    const logs = await rpc("eth_getLogs", [{ address: USDG, fromBlock: `0x${fromBlock.toString(16)}`, toBlock: "latest", topics: [TRANSFER_TOPIC, null, padAddress(wallet)] }]);
    const transactions = (logs as any[]).slice(-50).reverse().map((log) => ({
      hash: log.transactionHash,
      block: parseInt(log.blockNumber, 16),
      amount: Number(BigInt(log.data)) / 1e6,
      token: "USDG",
      recipient: wallet,
      status: "confirmed",
      explorer: `https://robinhoodchain.blockscout.com/tx/${log.transactionHash}`,
    }));
    return Response.json({ chainId: 4663, wallet, transactions, scannedBlocks: latest - fromBlock + 1 });
  } catch (error) {
    return Response.json({ error: "Could not read Robinhood transaction history", detail: String(error) }, { status: 502 });
  }
}
