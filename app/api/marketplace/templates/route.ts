import { listHostedTemplates } from "@/app/lib/hosted-templates";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ templates: listHostedTemplates() }, { headers: { "Cache-Control": "public, max-age=300" } });
}
