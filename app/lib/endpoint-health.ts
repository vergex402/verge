// Endpoint health check for marketplace listings, hardened against SSRF and
// DNS-rebinding: we resolve the hostname ONCE, validate every address is
// public, then pin the actual TCP connection to that exact address while
// keeping the real hostname for TLS SNI/certificate validation and the Host
// header. A plain fetch() would re-resolve DNS independently at connect
// time, letting an attacker return a public IP for our check and then swap
// in a private/internal address (cloud metadata endpoints, localhost, etc.)
// for the real request.
import { lookup as dnsLookup } from "node:dns/promises";
import * as https from "node:https";

function privateIpv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function privateIpv6(ip: string) {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

function isPrivateAddress(record: { address: string; family: number }) {
  return record.family === 4 ? privateIpv4(record.address) : privateIpv6(record.address);
}

interface PinnedResponse {
  status: number;
}

/** Issues a GET request with DNS pinned to `pinnedAddress`/`pinnedFamily`, TLS/Host set to `hostname`. */
function pinnedGet(url: URL, pinnedAddress: string, pinnedFamily: number): Promise<PinnedResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        servername: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { "User-Agent": "Verge-Gateway/1.0", Accept: "application/json, text/plain, */*" },
        // Overrides Node's own DNS resolution for this request only — the
        // socket connects to pinnedAddress no matter what the hostname's
        // live DNS records say by the time the connection is actually opened.
        lookup: (_hostname, opts, cb) => {
          if (opts && typeof opts === "object" && "all" in opts && opts.all) {
            cb(null, [{ address: pinnedAddress, family: pinnedFamily }]);
          } else {
            cb(null, pinnedAddress, pinnedFamily);
          }
        },
        timeout: 8_000,
      },
      (res) => {
        res.resume(); // drain body, we only care about the status/location
        // Node's https.request never auto-follows redirects (unlike fetch's
        // default), so 3xx already lands here as-is — surface it as a
        // non-2xx/401/402 status and let the caller reject it, rather than
        // silently following a redirect to an address we never validated.
        resolve({ status: res.statusCode || 0 });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Endpoint health check timed out")));
    req.end();
  });
}

export async function verifyEndpointUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("A public HTTPS URL is required");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Endpoint must be a public HTTPS URL on port 443");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Local endpoints cannot be listed");

  const records = await dnsLookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some(isPrivateAddress)) throw new Error("Endpoint must resolve to a public network address");

  const { address: pinnedAddress, family: pinnedFamily } = records[0];
  const response = await pinnedGet(url, pinnedAddress, pinnedFamily);
  if (![200, 401, 402].includes(response.status)) throw new Error(`Endpoint health check returned HTTP ${response.status}`);
  return { url: url.toString(), status: response.status, paymentRequired: response.status === 402 };
}
