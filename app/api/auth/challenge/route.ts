import { NextRequest } from "next/server";
import { makeChallenge } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  return Response.json(makeChallenge(address));
}
