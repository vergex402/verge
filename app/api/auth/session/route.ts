import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { consumeChallenge, createSession } from "@/app/lib/auth";
import { audit, allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`auth-session:${requestIp(req)}`, 20))) return rateLimitResponse();

  try {
    const { address, message, signature } = await req.json();
    if (!address || !message || !signature || !(await consumeChallenge(address, message, signature))) {
      return Response.json({ error: "Invalid or expired wallet signature" }, { status: 401 });
    }
    const session = await createSession(address);
    await audit("auth.session_created", address.toLowerCase(), session.token.slice(-8));
    const jar = await cookies();
    jar.set("verge_session", session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
    return Response.json({ ok: true, address: address.toLowerCase(), expiresAt: session.expiresAt });
  } catch {
    return Response.json({ error: "Invalid auth request" }, { status: 400 });
  }
}
