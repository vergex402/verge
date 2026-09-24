import { NextRequest } from "next/server";
import { HOSTED_TEMPLATES } from "@/app/lib/hosted-templates";
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

/**
 * Public, free preview of a hosted template's live data — proves the feed is
 * real before anyone pays for a published endpoint built on it. Shares the
 * same 60s cache as paid calls, so this never costs Verge an extra upstream
 * hit. Not a bypass of payment: this route is intentionally separate from
 * /x/[slug] and only serves the built-in template catalog, never a
 * publisher's priced listing.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowRateLimit(`preview:${requestIp(req)}`, 30))) return rateLimitResponse();
  const { id } = await params;
  const template = HOSTED_TEMPLATES[id];
  if (!template) return Response.json({ error: "Unknown template" }, { status: 404 });
  try {
    const data = await template.fetchData();
    return Response.json(
      { id: template.id, name: template.name, preview: true, data },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    return Response.json({ error: "Upstream data source unavailable", detail: String(error instanceof Error ? error.message : error) }, { status: 502 });
  }
}
