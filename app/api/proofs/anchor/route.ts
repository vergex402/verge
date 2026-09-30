// POST /api/proofs/anchor — persist an on-chain anchor tx for a batch.
// Auth: VERGE_ANCHOR_SECRET header (shared secret with the anchor keeper).
// Verifies the tx exists on-chain and its calldata commits the given root
// before persisting. Never returns or logs the anchor wallet.

import { NextRequest } from "next/server";
import { queryOne } from "@/app/lib/db";
import { publicAnchor, type AnchorRow } from "@/app/lib/proof-anchor";

export const runtime = "nodejs";

const UA = { "User-Agent": "Mozilla/5.0" };
const RPCS = [
  process.env.RH_RPC_URL,
  "https://rpc.mainnet.chain.robinhood.com",
  "https://robinhood-rpc.publicnode.com",
].filter((url): url is string => Boolean(url));

async function fetchTx(tx: string): Promise<{ input: string; status: string } | null> {
  for (const rpc of RPCS) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { ...UA, "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [tx] }),
        signal: AbortSignal.timeout(12_000),
      });
      const json = await res.json();
      const txData = json?.result;
      if (txData) return { input: txData.input || "", status: txData.blockNumber ? "1" : "pending" };
    } catch { /* try next RPC */ }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.VERGE_ANCHOR_SECRET;
  if (!secret || req.headers.get("x-anchor-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { batchId?: string; merkleRoot?: string; tx?: string; wallet?: string; chainId?: number };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  const { batchId, merkleRoot, tx, wallet, chainId } = body;
  if (!batchId || !merkleRoot || !tx || !wallet || !/^0x[0-9a-fA-F]{64}$/.test(tx)) {
    return Response.json({ error: "batchId, merkleRoot, tx, wallet, chainId required" }, { status: 400 });
  }

  const batch = await queryOne<{ id: string; merkle_root: string }>(`SELECT id, merkle_root FROM proof_batches WHERE id = $1`, [batchId]);
  if (!batch) return Response.json({ error: "Batch not found" }, { status: 404 });
  if (batch.merkle_root.toLowerCase() !== merkleRoot.toLowerCase()) {
    return Response.json({ error: "merkleRoot mismatch" }, { status: 409 });
  }

  const txData = await fetchTx(tx);
  if (!txData) return Response.json({ error: "Anchor tx not found on-chain yet" }, { status: 409 });
  if (!txData.input.includes(merkleRoot.replace(/^0x/i, ""))) {
    return Response.json({ error: "Tx calldata does not commit this merkle root" }, { status: 409 });
  }

  await queryOne(
    `UPDATE proof_batches SET anchor_tx = $1, anchor_wallet = $2, anchor_chain_id = $3, anchored_at = NOW()
     WHERE id = $4 AND (anchor_tx IS NULL OR anchor_tx = $1)`,
    [tx, wallet.toLowerCase(), chainId || 4663, batchId]
  );

  const row = await queryOne<AnchorRow>(
    `SELECT anchor_tx, anchor_wallet, anchor_chain_id, anchored_at FROM proof_batches WHERE id = $1`, [batchId]
  );
  return Response.json({ ok: true, anchor: publicAnchor(row ?? null) });
}
