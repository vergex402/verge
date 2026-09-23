import { NextRequest } from "next/server";
import { makeChallenge } from "@/app/lib/auth";
import { allowRateLimit, audit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await allowRateLimit(`auth-challenge:${requestIp(req)}`, 12))) return rateLimitResponse();
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  const challenge = await makeChallenge(address);
  await audit("auth.challenge_issued", address.toLowerCase(), null, { ip: requestIp(req) });
  return Response.json(challenge);
}
