import { NextResponse, type NextRequest } from "next/server";
import { isApiWriteBodyTooLarge } from "@/app/lib/request-security";

const CSP = (nonce: string) => [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://unpkg.com https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://fonts.reown.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' " + [
    "https://rpc.mainnet.chain.robinhood.com",
    "https://robinhood.drpc.org",
    "https://robinhood-rpc.publicnode.com",
    "https://robinhood.rpc.blxrbdn.com",
    "https://robinhood-mainnet.g.alchemy.com",
    "https://cloudflare-eth.com",
    "https://mainnet.base.org",
    "https://relay.walletconnect.com",
    "https://relay.walletconnect.org",
    "wss://relay.walletconnect.com",
    "wss://relay.walletconnect.org",
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "https://api.web3modal.org",
    "https://cca-lite.coinbase.com",
    "https://api.geckoterminal.com",
    "https://api.alternative.me",
    "https://api.coingecko.com",
    "https://cointelegraph.com",
    "https://registry.npmjs.org",
  ].join(" "),
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api" || request.nextUrl.pathname.startsWith("/api/")) {
    if (isApiWriteBodyTooLarge(request.method, request.headers)) {
      return NextResponse.json(
        { error: "Request body exceeds the 64 KiB JSON API limit" },
        { status: 413 },
      );
    }
    return NextResponse.next();
  }

  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = CSP(nonce);
  const requestHeaders = new Headers(request.headers);

  // Next reads this request CSP while rendering and adds the nonce to its scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
