import { NextRequest } from "next/server";
import { introspectApiKey } from "@/app/lib/api-key";

export const runtime = "nodejs";

/**
 * Public introspection endpoint — any third-party server can call this to check
 * whether a Verge API key is valid before granting access to their own resource.
 * Does not consume a quota unit (unlike passing the key directly to /api/demo).
 *
 *   curl -X POST https://vergesnowy.dev/api/keys/verify \
 *     -H "content-type: application/json" \
 *     -d '{"key":"vg_live_..."}'
 */
export async function POST(req: NextRequest) {
  let key: string | undefined;
  try {
    const body = await req.json();
    key = typeof body?.key === "string" ? body.key : undefined;
  } catch {
    key = undefined;
  }
  if (!key) key = req.headers.get("x-api-key") || undefined;

  const result = introspectApiKey(key);
  return Response.json(result, {
    status: result.ok ? 200 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}
