import { queryOne } from "@/app/lib/db";
import { robinhoodRpc, robinhoodRpcEndpoints } from "@/app/lib/robinhood-rpc";

export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  const checks: Record<string, unknown> = {};
  let ok = true;

  try {
    await queryOne("SELECT 1 AS ok");
    checks.database = "ok";
  } catch {
    checks.database = "failed";
    ok = false;
  }

  try {
    const chainId = await robinhoodRpc("eth_chainId", []);
    checks.robinhoodRpc = { chainId, endpointsConfigured: robinhoodRpcEndpoints().length };
    if (chainId !== "0x1237") ok = false;
  } catch {
    checks.robinhoodRpc = "failed";
    ok = false;
  }

  return Response.json({ ok, service: "verge-gateway", timestamp: new Date().toISOString(), latencyMs: Date.now() - started, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
