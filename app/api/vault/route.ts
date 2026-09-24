import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sessionAddress } from "@/app/lib/auth";
import { vaultPut, vaultList, vaultDelete } from "@/app/lib/vault";
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

/** List this wallet's vault entry metadata — names, hit counts, sizes. Never returns plaintext or ciphertext. */
export async function GET() {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const entries = await vaultList(address);
  return Response.json({ entries });
}

/** Store a secret. { name, value } — name is referenced later as {{name}} in agent templates. */
export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`vault-write:${requestIp(req)}`, 30))) return rateLimitResponse();
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const { name, value } = await req.json();
    if (typeof name !== "string" || typeof value !== "string") return Response.json({ error: "name and value are required strings" }, { status: 400 });
    const result = await vaultPut(address, name, value);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not store secret" }, { status: 400 });
  }
}

/** Delete a secret by name. */
export async function DELETE(req: NextRequest) {
  const address = await owner();
  if (!address) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });
  const deleted = await vaultDelete(address, name);
  if (!deleted) return Response.json({ error: "Entry not found" }, { status: 404 });
  return Response.json({ ok: true });
}
