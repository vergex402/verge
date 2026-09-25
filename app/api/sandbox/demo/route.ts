// GET /api/sandbox/demo — simulated x402 flow for sandbox testing.
// Returns a real-looking 402 challenge on first call, then accepts
// ANY X-Pay-Tx header (no on-chain verification) and returns 200.
// Only active when session has sandbox=true.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { queryOne } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

const SANDBOX_NONCES = new Map<string, number>(); // nonce → expiry

export async function GET(req: NextRequest) {
  // Verify sandbox session
  const jar = await cookies();
  const token = jar.get("verge_session")?.value;
  const wallet = token ? await sessionAddress(token) : null;
  if (!wallet) return Response.json({ error: "Wallet session required for sandbox" }, { status: 401 });

  const row = await queryOne<{ sandbox: boolean }>(`SELECT sandbox FROM sessions WHERE token = $1`, [token]);
  if (!row?.sandbox) {
    return Response.json({ error: "Sandbox mode is not enabled. Toggle it in Settings → Sandbox." }, { status: 403 });
  }

  const payTx = req.headers.get("x-pay-tx");
  const payNonce = req.headers.get("x-pay-nonce");

  // Payment retry — accept anything (sandbox)
  if (payTx && payNonce) {
    const nonceExp = SANDBOX_NONCES.get(payNonce);
    if (!nonceExp || Date.now() > nonceExp) {
      return Response.json({ error: "Nonce expired or invalid. Request a fresh challenge.", code: "NONCE_INVALID" }, { status: 402 });
    }
    SANDBOX_NONCES.delete(payNonce);
    return Response.json({
      ok: true,
      sandbox: true,
      message: "Sandbox payment accepted — no real USDG was transferred.",
      tx: payTx,
      nonce: payNonce,
      data: {
        fact: "This is sandbox mode. The x402 flow ran end-to-end, but no on-chain settlement occurred.",
        network: "robinhood-mainnet-sandbox",
        amount: "0.001 USDG (simulated)",
        timestamp: new Date().toISOString(),
      },
    }, { headers: { "X-Settlement-Verified": "sandbox" } });
  }

  // Issue sandbox challenge
  const nonce = `sandbox_${randomBytes(12).toString("hex")}`;
  SANDBOX_NONCES.set(nonce, Date.now() + 5 * 60 * 1000); // 5 min TTL

  const origin = (() => {
    const xfHost = req.headers.get("x-forwarded-host");
    const xfProto = req.headers.get("x-forwarded-proto") || "https";
    if (xfHost) return `${xfProto.split(",")[0].trim()}://${xfHost.split(",")[0].trim()}`;
    return new URL(req.url).origin;
  })();

  const challenge = {
    x402Version: 2,
    error: "Payment required",
    sandbox: true,
    resource: {
      url: `${origin}/api/sandbox/demo`,
      mimeType: "application/json",
      serviceName: "Verge Sandbox Demo",
      description: "Sandbox x402 endpoint — no real payment required",
    },
    accepts: [{
      scheme: "exact",
      network: "eip155:4663",
      asset: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      amount: "1000",
      recipient: wallet,
      nonce,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }],
  };

  const paymentRequired = Buffer.from(JSON.stringify(challenge)).toString("base64");

  return new Response(JSON.stringify({ error: "Payment required (sandbox)", code: "PAYMENT_REQUIRED", sandbox: true, nonce, hint: `Retry with X-Pay-Tx: any_hash and X-Pay-Nonce: ${nonce}` }), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-REQUIRED": paymentRequired,
      "WWW-Authenticate": `x402 realm="verge-sandbox", nonce="${nonce}"`,
      "X-Pay-Nonce": nonce,
    },
  });
}
