// GET /api/facilitator/supported — x402 v2 facilitator discovery (spec §7.3).
// Lists every scheme/network this facilitator can verify and settle.

import { listRails, caip2Of, X402_VERSION } from "@vergex402/core";

export const runtime = "nodejs";

export async function GET() {
  const kinds = listRails().map((rail) => ({
    x402Version: X402_VERSION,
    scheme: "exact",
    network: caip2Of(rail.id),
  }));
  return Response.json(
    {
      kinds,
      extensions: ["x-verge"],
      verifier: "verge-facilitator",
      details: {
        paymentFlow: "upfront",
        assetTransferMethod: "direct-transfer",
        note: "Clients pay the quoted amount directly to payTo, then submit the settlement tx hash. Verge verifies on-chain and commits replay-proof state.",
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
