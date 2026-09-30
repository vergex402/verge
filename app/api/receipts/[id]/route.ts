import { NextRequest } from "next/server";
import { queryOne } from "@/app/lib/db";
import { toPublicReceipt } from "@/app/lib/public-receipt";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^rcpt_[a-f0-9]{32}$/.test(id)) return Response.json({ error: "Receipt not found" }, { status: 404 });
  const row = await queryOne<{
    public_id: string; amount_usdg: number; network: string | null; asset: string | null;
    resource_name: string | null; payer_address: string | null; wallet: string; tx_hash: string | null; settled_at: string;
  }>(`SELECT public_id, amount_usdg, network, asset, resource_name, payer_address, wallet, tx_hash, settled_at
      FROM payments_log WHERE public_id = $1`, [id]);
  if (!row) return Response.json({ error: "Receipt not found" }, { status: 404 });
  return Response.json(toPublicReceipt(row), { headers: { "Cache-Control": "public, max-age=60" } });
}
