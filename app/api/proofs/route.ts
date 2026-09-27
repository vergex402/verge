// GET  /api/proofs?batch=<batchId>   — fetch proof for a specific batch
// GET  /api/proofs?latest=true       — get latest batch proof (public)
// POST /api/proofs/generate          — generate + store a new batch proof (wallet-authed)
//
// Merkle Batch Settlement Proofs
// ─────────────────────────────
// Each "batch" covers a window of payments_log rows. Their leaves are:
//   keccak256(abi.encode(id, wallet, payer, amountUsdg, settledAt))
// The Merkle root is stored in proof_batches. Anyone can verify any
// individual settlement is in a batch with the Merkle path returned here.
//
// This is the same batch-proof pattern used by Optimism and zkSync:
// off-chain Merkle tree, on-chain or DB-anchored root, anyone can verify.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { query, queryOne, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// ── DB schema ───────────────────────────────────────────────────────────────

async function ensureProofSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS proof_batches (
      id          TEXT PRIMARY KEY,
      wallet      TEXT NOT NULL,
      merkle_root TEXT NOT NULL,
      leaf_count  INTEGER NOT NULL,
      first_log_id BIGINT,
      last_log_id  BIGINT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS proof_batches_wallet_idx ON proof_batches(wallet, created_at DESC);
  `);
}

// ── Merkle helpers (pure Node, no external deps) ────────────────────────────

function keccak256Hex(data: string): string {
  return createHash("sha3-256").update(data).digest("hex");
}

function hashLeaf(row: {
  id: string | number;
  wallet: string;
  payer_address: string | null;
  amount_usdg: number;
  settled_at: string;
}): string {
  const packed = `${row.id}:${(row.wallet || "").toLowerCase()}:${(row.payer_address || "").toLowerCase()}:${row.amount_usdg.toFixed(6)}:${row.settled_at}`;
  return keccak256Hex(packed);
}

function buildMerkleTree(leaves: string[]): { root: string; tree: string[][] } {
  if (leaves.length === 0) return { root: "", tree: [] };
  if (leaves.length === 1) return { root: leaves[0], tree: [leaves] };

  const tree: string[][] = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? left; // duplicate last if odd
      // Sort pair so proof order doesn't matter (commutative)
      const [a, b] = left < right ? [left, right] : [right, left];
      next.push(keccak256Hex(a + b));
    }
    tree.push(next);
    current = next;
  }

  return { root: current[0], tree };
}

function getMerkleProof(tree: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let level = 0; level < tree.length - 1; level++) {
    const levelNodes = tree[level];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < levelNodes.length) {
      proof.push(levelNodes[siblingIdx]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string,
): boolean {
  let current = leaf;
  for (const sibling of proof) {
    const [a, b] = current < sibling ? [current, sibling] : [sibling, current];
    current = keccak256Hex(a + b);
  }
  return current === root;
}

// ── Route handlers ───────────────────────────────────────────────────────────

type PaymentLogRow = {
  id: string;
  wallet: string;
  payer_address: string | null;
  amount_usdg: number;
  settled_at: string;
};

type BatchRow = {
  id: string;
  wallet: string;
  merkle_root: string;
  leaf_count: number;
  first_log_id: string;
  last_log_id: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  if (!(await allowRateLimit(`proofs:get:${requestIp(req)}`, 60))) return rateLimitResponse();

  await ensureProofSchema();

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batch");
  const latest = searchParams.get("latest") === "true";
  const settle = searchParams.get("settle"); // verify a specific settlement ID

  // ── /api/proofs?latest=true — public, no auth ───────────────────────────
  if (latest) {
    const row = await queryOne<BatchRow>(
      `SELECT * FROM proof_batches ORDER BY created_at DESC LIMIT 1`
    );
    if (!row) return Response.json({ error: "No batches yet" }, { status: 404 });
    return Response.json({
      batchId: row.id,
      merkleRoot: row.merkle_root,
      leafCount: row.leaf_count,
      logRange: { first: row.first_log_id, last: row.last_log_id },
      createdAt: row.created_at,
    });
  }

  // ── /api/proofs?batch=<id>&settle=<logId> — verify a settlement is in batch
  if (batchId && settle) {
    const batch = await queryOne<BatchRow>(
      `SELECT * FROM proof_batches WHERE id=$1`, [batchId]
    );
    if (!batch) return Response.json({ error: "Batch not found" }, { status: 404 });

    // Re-fetch the rows for this batch to reconstruct the tree
    const rows = await query<PaymentLogRow>(
      `SELECT id, wallet, payer_address, amount_usdg, settled_at
       FROM payments_log
       WHERE id BETWEEN $1 AND $2
       ORDER BY id ASC`,
      [batch.first_log_id, batch.last_log_id]
    );

    const leaves = rows.map(hashLeaf);
    const { root, tree } = buildMerkleTree(leaves);

    if (root !== batch.merkle_root) {
      return Response.json({ error: "Batch root mismatch — data may have changed" }, { status: 500 });
    }

    const targetIdx = rows.findIndex(r => String(r.id) === String(settle));
    if (targetIdx === -1) {
      return Response.json({ error: "Settlement not found in this batch" }, { status: 404 });
    }

    const leaf = leaves[targetIdx];
    const proof = getMerkleProof(tree, targetIdx);
    const valid = verifyMerkleProof(leaf, proof, root);

    return Response.json({
      valid,
      batchId,
      settlementId: settle,
      leaf,
      merkleRoot: root,
      proof,
      leafIndex: targetIdx,
      verifyLocally: `verifyMerkleProof(leaf, proof, root) === ${valid}`,
    });
  }

  // ── /api/proofs?batch=<id> — fetch batch info ──────────────────────────
  if (batchId) {
    const row = await queryOne<BatchRow>(
      `SELECT * FROM proof_batches WHERE id=$1`, [batchId]
    );
    if (!row) return Response.json({ error: "Batch not found" }, { status: 404 });
    return Response.json({
      batchId: row.id,
      merkleRoot: row.merkle_root,
      leafCount: row.leaf_count,
      logRange: { first: row.first_log_id, last: row.last_log_id },
      wallet: row.wallet,
      createdAt: row.created_at,
    });
  }

  // ── /api/proofs — list batches for wallet (auth required) ──────────────
  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  const batches = await query<BatchRow>(
    `SELECT id, merkle_root, leaf_count, first_log_id, last_log_id, created_at
     FROM proof_batches WHERE wallet=$1 ORDER BY created_at DESC LIMIT 20`,
    [wallet.toLowerCase()]
  );

  return Response.json({ wallet, batches });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`proofs:post:${requestIp(req)}`, 10))) return rateLimitResponse();

  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  await ensureProofSchema();

  // Fetch the last batch's last_log_id so we don't re-include old rows
  const lastBatch = await queryOne<{ last_log_id: string }>(
    `SELECT last_log_id FROM proof_batches WHERE wallet=$1 ORDER BY created_at DESC LIMIT 1`,
    [wallet.toLowerCase()]
  );
  const afterId = lastBatch ? BigInt(lastBatch.last_log_id) : BigInt(0);

  // Get unbatched settlements for this wallet
  const rows = await query<PaymentLogRow>(
    `SELECT id, wallet, payer_address, amount_usdg, settled_at
     FROM payments_log
     WHERE wallet=$1 AND id > $2
     ORDER BY id ASC
     LIMIT 500`,
    [wallet.toLowerCase(), afterId]
  );

  if (rows.length === 0) {
    return Response.json({ error: "No new settlements to batch" }, { status: 400 });
  }

  // Build Merkle tree
  const leaves = rows.map(hashLeaf);
  const { root } = buildMerkleTree(leaves);

  const ids = rows.map(r => BigInt(r.id));
  const firstId = ids.reduce((a, b) => a < b ? a : b).toString();
  const lastId  = ids.reduce((a, b) => a > b ? a : b).toString();

  const { randomBytes } = await import("node:crypto");
  const batchId = `batch_${randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi,"").slice(0,14)}`;

  await query(
    `INSERT INTO proof_batches(id, wallet, merkle_root, leaf_count, first_log_id, last_log_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [batchId, wallet.toLowerCase(), root, rows.length, firstId, lastId]
  );

  return Response.json({
    ok: true,
    batchId,
    merkleRoot: root,
    leafCount: rows.length,
    logRange: { first: firstId, last: lastId },
    message: `Batch proof generated for ${rows.length} settlement${rows.length === 1 ? "" : "s"}. Verify any settlement at GET /api/proofs?batch=${batchId}&settle=<logId>`,
  });
}
