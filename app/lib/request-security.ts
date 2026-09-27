import type { NextRequest } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Client IP for rate limiting. Cloudflare sets cf-connecting-ip after removing
 * untrusted client-provided headers, so it must win over X-Forwarded-For.
 */
export function requestIp(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 100);

  // Non-Cloudflare fallback: use the rightmost proxy address, not the
  // attacker-controlled leftmost entry.
  const forwarded = req.headers.get("x-forwarded-for");
  const rightmost = forwarded?.split(",").map((v) => v.trim()).filter(Boolean).at(-1);
  return (rightmost || "unknown").slice(0, 100);
}

export function rateLimitResponse() {
  return Response.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
}

export function hasOversizedBody(req: NextRequest, maxBytes = 16_384): boolean {
  const raw = req.headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return !Number.isFinite(length) || length < 0 || length > maxBytes;
}

function isPrivateAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 ||
      a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31 ||
      a >= 224;
  }
  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.");
  }
  return true;
}

/**
 * Validate an external URL before server-side fetches. We allow only public
 * HTTP(S) origins, resolve DNS once to reject private/DNS-rebind targets, and
 * callers must use redirect:"manual" so a safe URL cannot redirect internally.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  if (raw.length === 0 || raw.length > 2048) throw new Error("URL must be 1–2048 characters");
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http/https URLs are allowed");
  if (url.username || url.password) throw new Error("Credential-bearing URLs are not allowed");

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host)) {
    throw new Error("Private, loopback, and link-local URLs are not allowed");
  }

  // Resolve every returned address: block if even one is non-public.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("URL hostname could not be resolved");
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private, loopback, and link-local URLs are not allowed");
  }
  return url;
}
