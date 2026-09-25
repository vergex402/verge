// /api/sandbox/route.ts — toggle sandbox mode on/off for the current wallet session.
// In sandbox mode, /api/demo returns a simulated 402→200 flow without
// requiring real USDG. Useful for integration testing without on-chain txs.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { query, queryOne, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("verge_session")?.value;
  if (!token) return Response.json({ sandbox: false });
  const row = await queryOne<{ sandbox: boolean }>(`SELECT sandbox FROM sessions WHERE token = $1`, [token]);
  return Response.json({ sandbox: row?.sandbox ?? false });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`sandbox-toggle:${requestIp(req)}`, 20))) return rateLimitResponse();
  const jar = await cookies();
  const token = jar.get("verge_session")?.value;
  if (!token) return Response.json({ error: "Session required" }, { status: 401 });
  const wallet = await sessionAddress(token);
  if (!wallet) return Response.json({ error: "Session required" }, { status: 401 });

  let body: { sandbox?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }
  const sandbox = body.sandbox === true;

  await query(`UPDATE sessions SET sandbox = $1 WHERE token = $2`, [sandbox, token]);
  return Response.json({ sandbox, wallet });
}
