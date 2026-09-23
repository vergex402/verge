import { NextRequest } from "next/server";
import { query } from "@/app/lib/db";
import { listRails } from "@vergex402/core";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.dev";

export async function GET(_req: NextRequest) {
  const listings = await query(`SELECT id, name, url, price_usdg as price, description,
    payment_required as "paymentRequired", payment_network as network, payment_asset as asset, payment_chain_id as "chainId",
    requests_count as "requestsCount", paid_calls_count as "paidCallsCount", settlement_volume as "settlementVolume" FROM endpoints
    WHERE revoked_at IS NULL AND health_status IN (200, 401, 402) ORDER BY created_at DESC LIMIT 100`);

  return Response.json({
    name: "Verge Gateway",
    version: "1.0",
    network: { name: "Robinhood Chain", chainId: 4663, asset: "USDG", flagship: true },
    supportedRails: listRails().map(({ id, chainId, chain, asset, tokenContract, decimals, explorerUrl }) => ({ id, chainId, name: chain.name, asset, tokenContract, decimals, explorerUrl })),
    protocol: "x402",
    discovery: {
      documentation: `${baseUrl}/docs`,
      gateway: `${baseUrl}/app`,
      catalog: `${baseUrl}/api/catalog`,
    },
    endpoints: [
      {
        id: "verge-payment-demo", name: "USDG payment challenge", method: "GET", url: `${baseUrl}/api/demo`,
        price: "0.001 USDG", paymentRequired: true,
        description: "Returns an HTTP 402 challenge. Replaying with a verified USDG transfer unlocks the endpoint.",
      },
      {
        id: "verge-marketplace", name: "Verified endpoint directory", method: "GET", url: `${baseUrl}/api/marketplace`,
        paymentRequired: false, description: "Lists public endpoint registrations that passed Verge health verification.",
      },
      {
        id: "verge-key-verify", name: "API key introspection", method: "POST", url: `${baseUrl}/api/keys/verify`,
        paymentRequired: false, description: "Third-party servers can verify a Verge-issued API key (validity, quota, revocation) without consuming a request.",
      },
      ...listings,
    ],
  }, { headers: { "Cache-Control": "public, max-age=60" } });
}
