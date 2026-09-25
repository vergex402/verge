// /api/domains — custom hostname management for hosted Verge endpoints.
// A publisher creates a CNAME from their subdomain to the Verge Cloudflare Tunnel.
// Once DNS verifies, the hostname can serve the endpoint at /x/<slug>.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { lookup as dnsLookup, resolveCname } from "node:dns/promises";
import { randomBytes } from "node:crypto";
import { query, queryOne, allowRateLimit } from "@/app/lib/db";
import { sessionAddress } from "@/app/lib/auth";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

const TUNNEL_TARGET = "9359051d-eaab-405d-93f0-47579d93985a.cfargotunnel.com";
const DOMAIN_RE = /^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

async function owner() {
  const jar = await cookies();
  return sessionAddress(jar.get("verge_session")?.value);
}

function normalizeDomain(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("domain is required");
  const domain = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!DOMAIN_RE.test(domain)) throw new Error("A valid subdomain is required (e.g. api.example.com)");
  if (["localhost", "vergesnowy.com", "www.vergesnowy.com"].includes(domain) || domain.endsWith(".local")) {
    throw new Error("This hostname cannot be used");
  }
  return domain;
}

async function verifyCname(domain: string): Promise<boolean> {
  // DNS CNAME chains may include a provider hop. Resolve once and accept the
  // Verge tunnel target anywhere in the resolved canonical chain.
  try {
    const cnames = await resolveCname(domain);
    if (cnames.some((c) => c.replace(/\.$/, "").toLowerCase() === TUNNEL_TARGET)) return true;
    // Some DNS providers flatten CNAME at the authoritative answer. A public
    // resolution must at least exist; flattened verification is intentionally
    // not accepted because we need proof of tunnel ownership.
    await dnsLookup(domain);
  } catch { /* no verified CNAME */ }
  return false;
}

export async function GET() {
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const domains = await query(
    `SELECT d.id, d.domain, d.endpoint_id as "endpointId", d.status, d.verified_at as "verifiedAt", d.created_at as "createdAt",
      e.name as "endpointName", e.hosted_slug as "hostedSlug"
     FROM custom_domains d LEFT JOIN endpoints e ON e.id = d.endpoint_id
     WHERE d.wallet = $1 ORDER BY d.created_at DESC`,
    [wallet]
  );
  return Response.json({ tunnelTarget: TUNNEL_TARGET, domains });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`domains-create:${requestIp(req)}`, 10))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  try {
    const body = await req.json();
    const domain = normalizeDomain(body.domain);
    const endpointId = typeof body.endpointId === "string" ? body.endpointId : "";
    const endpoint = await queryOne<{ id: string; hostedSlug: string | null }>(
      `SELECT id, hosted_slug as "hostedSlug" FROM endpoints WHERE id = $1 AND wallet = $2 AND revoked_at IS NULL`,
      [endpointId, wallet]
    );
    if (!endpoint?.hostedSlug) return Response.json({ error: "Choose one of your active hosted endpoints" }, { status: 400 });

    const existing = await queryOne<{ id: string }>(`SELECT id FROM custom_domains WHERE domain = $1`, [domain]);
    if (existing) return Response.json({ error: "This hostname is already registered" }, { status: 409 });

    const id = `dom_${randomBytes(8).toString("hex")}`;
    const now = new Date().toISOString();
    await query(
      `INSERT INTO custom_domains(id, wallet, domain, endpoint_id, status, created_at) VALUES ($1,$2,$3,$4,'pending',$5)`,
      [id, wallet, domain, endpoint.id, now]
    );
    return Response.json({
      id, domain, endpointId: endpoint.id, status: "pending", tunnelTarget: TUNNEL_TARGET,
      instructions: `Create a DNS CNAME record: ${domain} → ${TUNNEL_TARGET}. Then click Verify. Your endpoint will be available at https://${domain}/x/${endpoint.hostedSlug}`,
      endpointUrl: `https://${domain}/x/${endpoint.hostedSlug}`,
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid custom domain" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await allowRateLimit(`domains-verify:${requestIp(req)}`, 20))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const domain = await queryOne<{ domain: string }>(`SELECT domain FROM custom_domains WHERE id = $1 AND wallet = $2`, [id, wallet]);
  if (!domain) return Response.json({ error: "Custom domain not found" }, { status: 404 });
  const verified = await verifyCname(domain.domain);
  if (!verified) return Response.json({ error: `CNAME not verified. Point ${domain.domain} to ${TUNNEL_TARGET} and wait for DNS propagation.`, status: "pending" }, { status: 409 });
  const now = new Date().toISOString();
  await query(`UPDATE custom_domains SET status = 'active', verified_at = $1 WHERE id = $2`, [now, id]);
  return Response.json({ ok: true, status: "active", verifiedAt: now });
}

export async function DELETE(req: NextRequest) {
  if (!(await allowRateLimit(`domains-delete:${requestIp(req)}`, 20))) return rateLimitResponse();
  const wallet = await owner();
  if (!wallet) return Response.json({ error: "Wallet session required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const result = await queryOne(`DELETE FROM custom_domains WHERE id = $1 AND wallet = $2 RETURNING id`, [id, wallet]);
  if (!result) return Response.json({ error: "Custom domain not found" }, { status: 404 });
  return Response.json({ ok: true });
}
