import { lookup } from "node:dns/promises";

function privateIpv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function privateIpv6(ip: string) {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

export async function verifyEndpointUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("A public HTTPS URL is required");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Endpoint must be a public HTTPS URL on port 443");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Local endpoints cannot be listed");

  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((r) => r.family === 4 ? privateIpv4(r.address) : privateIpv6(r.address))) throw new Error("Endpoint must resolve to a public network address");

  const response = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "Verge-Gateway/1.0", Accept: "application/json, text/plain, */*" } });
  if (![200, 401, 402].includes(response.status)) throw new Error(`Endpoint health check returned HTTP ${response.status}`);
  return { url: url.toString(), status: response.status, paymentRequired: response.status === 402 };
}
