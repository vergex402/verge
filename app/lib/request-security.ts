import type { NextRequest } from "next/server";
import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

/** Client IP for rate limiting. */
export function requestIp(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 100);
  const forwarded = req.headers.get("x-forwarded-for");
  const rightmost = forwarded?.split(",").map((v) => v.trim()).filter(Boolean).at(-1);
  return (rightmost || "unknown").slice(0, 100);
}

export function rateLimitResponse() {
  return Response.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
}

export const API_WRITE_BODY_LIMIT_BYTES = 64 * 1024;

/** Shared proxy guard for every JSON API write before its route parses a body. */
export function isApiWriteBodyTooLarge(method: string, headers: Headers): boolean {
  if (!new Set(["POST", "PUT", "PATCH"]).has(method.toUpperCase())) return false;
  const raw = headers.get("content-length");
  const contentType = headers.get("content-type")?.toLowerCase() || "";
  // Every JSON write must declare its length. This rejects HTTP/2/chunked JSON
  // bodies that would otherwise bypass the proxy-level limit. Bodyless writes
  // (such as POST /api/proofs) remain allowed.
  if (!raw) return contentType.includes("application/json") || Boolean(headers.get("transfer-encoding"));
  const length = Number(raw);
  return !Number.isFinite(length) || length < 0 || length > API_WRITE_BODY_LIMIT_BYTES;
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
      a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31 || a >= 224;
  }
  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.");
  }
  return true;
}

export type PublicHttpUrl = URL & { readonly resolvedAddresses: ReadonlyArray<{ address: string; family: number }> };

/**
 * Validates an external URL and captures the public DNS answers for the exact
 * egress request. Use fetchPublicHttpUrl rather than global fetch so the
 * connection cannot be rebound between validation and connect.
 */
export async function assertPublicHttpUrl(raw: string): Promise<PublicHttpUrl> {
  if (raw.length === 0 || raw.length > 2048) throw new Error("URL must be 1–2048 characters");
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http/https URLs are allowed");
  if (url.username || url.password) throw new Error("Credential-bearing URLs are not allowed");

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host)) {
    throw new Error("Private, loopback, and link-local URLs are not allowed");
  }
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("URL hostname could not be resolved");
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private, loopback, and link-local URLs are not allowed");
  }
  Object.defineProperty(url, "resolvedAddresses", { value: addresses, enumerable: false });
  return url as PublicHttpUrl;
}

function headerRecord(headers: HeadersInit | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => { result[key] = value; });
  return result;
}

/**
 * Fetches a URL using a DNS answer captured by assertPublicHttpUrl. Node's
 * request APIs do not follow redirects, so callers get a manual redirect just
 * like fetch(..., { redirect: "manual" }) without a second unvalidated hop.
 */
export async function fetchPublicHttpUrl(url: PublicHttpUrl, init: RequestInit = {}): Promise<Response> {
  const pinned = url.resolvedAddresses[0];
  if (!pinned) throw new Error("URL has no validated address");
  const transport = url.protocol === "https:" ? https : http;
  const body = init.body == null ? undefined : typeof init.body === "string" || init.body instanceof Uint8Array ? init.body : String(init.body);

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      servername: url.protocol === "https:" ? url.hostname : undefined,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: init.method ?? "GET",
      headers: headerRecord(init.headers),
      lookup: (_hostname, options, callback) => {
        if (typeof options === "object" && options?.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, (res) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
        else if (value !== undefined) headers.set(key, value);
      }
      resolve(new Response(Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>, { status: res.statusCode ?? 502, statusText: res.statusMessage, headers }));
    });
    const abort = () => req.destroy(init.signal?.reason instanceof Error ? init.signal.reason : new Error("Request aborted"));
    if (init.signal?.aborted) return abort();
    init.signal?.addEventListener("abort", abort, { once: true });
    req.once("close", () => init.signal?.removeEventListener("abort", abort));
    req.once("error", reject);
    if (body === undefined) req.end(); else req.end(body);
  });
}
