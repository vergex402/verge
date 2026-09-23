import { queryOne, query } from "@/app/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const endpoint = await queryOne<{
    id: string; name: string; url: string; price: number; description: string; wallet: string;
    healthStatus: number; paymentRequired: number; checkedAt: string; createdAt: string;
    network: string; asset: string; chainId: number; requestsCount: number; paidCallsCount: number; settlementVolume: number;
  }>(`SELECT id, name, url, price_usdg as price, description, wallet, health_status as "healthStatus",
    payment_required as "paymentRequired", checked_at as "checkedAt", created_at as "createdAt",
    payment_network as network, payment_asset as asset, payment_chain_id as "chainId",
    requests_count as "requestsCount", paid_calls_count as "paidCallsCount", settlement_volume as "settlementVolume"
    FROM endpoints WHERE id = $1 AND revoked_at IS NULL`, [id]);
  if (!endpoint) return Response.json({ error: "Endpoint not found" }, { status: 404 });
  await query("UPDATE endpoints SET requests_count = requests_count + 1 WHERE id = $1", [id]);
  return Response.json({ endpoint: { ...endpoint, requestsCount: Number(endpoint.requestsCount || 0) + 1 } }, { headers: { "Cache-Control": "public, max-age=30" } });
}
