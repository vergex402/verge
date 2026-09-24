import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { createAgentWallet, listAgentWallets } from "@/app/lib/wallets";
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

/** List agent wallets created under this session wallet (addresses only). */
export async function GET() {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const wallets = await listAgentWallets(address);
  return Response.json({ wallets });
}

/** Generate a new agent wallet on Robinhood Chain 4663. Private key is returned ONCE. */
export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`wallet-create:${requestIp(req)}`, 10))) return rateLimitResponse();
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const wallet = await createAgentWallet(address, typeof body?.label === "string" ? body.label : undefined);
    return Response.json(wallet, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create wallet" }, { status: 400 });
  }
}
