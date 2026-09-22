import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { robinhoodRpc } from "@/app/lib/robinhood-rpc";

export const runtime = "nodejs";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function padAddress(address: string) { return `0x${address.slice(2).padStart(64, "0")}`; }

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const wallet = sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const latest = parseInt(await robinhoodRpc("eth_blockNumber", []) as string, 16);
    const fromBlock = Math.max(0, latest - Number(process.env.ROBINHOOD_SCAN_BLOCKS || 2000));
    const logs = await robinhoodRpc("eth_getLogs", [{ address: USDG, fromBlock: `0x${fromBlock.toString(16)}`, toBlock: "latest", topics: [TRANSFER_TOPIC, null, padAddress(wallet)] }]);
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
