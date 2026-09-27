// GET  /api/splits       — list all split rules for connected wallet
// POST /api/splits       — create a split rule
// DELETE /api/splits?id= — delete a split rule
//
// Revenue Splits: automatically distribute a % of incoming USDG payments to
// co-founders, affiliates, DAO treasury, or protocol fee wallets.
// Each rule specifies a recipient + basis points. Rules under a wallet sum to ≤10000 bps (100%).
// When a payment settles and a split exists, the distribution is queued atomically.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { query, queryOne, audit, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const MAX_SPLITS_PER_WALLET = 10;

// Ensure splits table exists (idempotent)
async function ensureSplitsSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS revenue_splits (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,          -- owner (who receives the incoming payment)
      recipient TEXT NOT NULL,       -- who gets the split payout
      basis_points INTEGER NOT NULL  -- out of 10000 (e.g. 2000 = 20%)
        CHECK (basis_points > 0 AND basis_points <= 10000),
      label TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(wallet, recipient)
    );
    CREATE INDEX IF NOT EXISTS splits_wallet_idx ON revenue_splits(wallet);
  `);
}

type Split = { id: string; wallet: string; recipient: string; basis_points: number; label: string; active: boolean; created_at: string };

export async function GET(req: NextRequest) {
  if (!(await allowRateLimit(`splits:get:${requestIp(req)}`, 60))) return rateLimitResponse();

  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  await ensureSplitsSchema();
  const splits = await query<Split>(
    `SELECT id, recipient, basis_points, label, active, created_at FROM revenue_splits WHERE wallet=$1 ORDER BY created_at`,
    [wallet.toLowerCase()]
  );
  const totalBps = splits.filter(s => s.active).reduce((sum, s) => sum + s.basis_points, 0);
  return Response.json({ wallet, splits, totalBps, remainingBps: 10000 - totalBps });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`splits:post:${requestIp(req)}`, 20))) return rateLimitResponse();

  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  let body: { recipient?: string; basisPoints?: number; label?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { recipient, basisPoints, label = "" } = body;
  if (!recipient || !WALLET_RE.test(recipient)) return Response.json({ error: "recipient must be a valid EVM address" }, { status: 400 });
  if (!basisPoints || basisPoints < 1 || basisPoints > 10000) return Response.json({ error: "basisPoints must be 1–10000" }, { status: 400 });
  if (recipient.toLowerCase() === wallet.toLowerCase()) return Response.json({ error: "Cannot split to self" }, { status: 400 });

  await ensureSplitsSchema();

  // Check total won't exceed 100%
  const existing = await query<{ total: string }>(
    `SELECT COALESCE(SUM(basis_points),0) as total FROM revenue_splits WHERE wallet=$1 AND active=TRUE`,
    [wallet.toLowerCase()]
  );
  const currentTotal = parseInt(existing[0]?.total || "0");
  if (currentTotal + basisPoints > 10000) {
    return Response.json({ error: `Split would exceed 100%: current ${currentTotal} bps + ${basisPoints} bps > 10000` }, { status: 400 });
  }

  // Check count
  const count = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text as c FROM revenue_splits WHERE wallet=$1`,
    [wallet.toLowerCase()]
  );
  if (parseInt(count?.c || "0") >= MAX_SPLITS_PER_WALLET) {
    return Response.json({ error: `Max ${MAX_SPLITS_PER_WALLET} splits per wallet` }, { status: 400 });
  }

  const { randomBytes } = await import("node:crypto");
  const id = `spl_${randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;

  await query(
    `INSERT INTO revenue_splits(id, wallet, recipient, basis_points, label) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT(wallet, recipient) DO UPDATE SET basis_points=$4, label=$5, active=TRUE`,
    [id, wallet.toLowerCase(), recipient.toLowerCase(), basisPoints, label.slice(0, 64)]
  );

  await audit("split.created", wallet, id, { recipient, basisPoints, label });
  return Response.json({ ok: true, id, recipient, basisPoints, label, totalBps: currentTotal + basisPoints });
}

export async function DELETE(req: NextRequest) {
  if (!(await allowRateLimit(`splits:del:${requestIp(req)}`, 20))) return rateLimitResponse();

  const jar = await cookies();
  const wallet = await sessionAddress(jar.get("verge_session")?.value);
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await ensureSplitsSchema();
  const res = await query(
    `DELETE FROM revenue_splits WHERE id=$1 AND wallet=$2 RETURNING id`,
    [id, wallet.toLowerCase()]
  );
  if (!res.length) return Response.json({ error: "Split not found" }, { status: 404 });

  await audit("split.deleted", wallet, id);
  return Response.json({ ok: true, id });
}
