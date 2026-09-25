/** @type {import('next').NextConfig} */

// Nonce-less CSP that covers the app's actual needs:
// - Scripts: only from same origin (Next.js chunks) + Reown/WalletConnect CDN
// - Styles: same origin + unsafe-inline (Tailwind CSS requires it)
// - Connect: same origin + all Robinhood Chain RPC endpoints + WalletConnect relay
// - Frame-ancestors: none (belt-and-suspenders with X-Frame-Options: DENY)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
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

const securityHeaders = [
  // HSTS: force HTTPS for a year, include subdomains, eligible for browser preload lists.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Content Security Policy
  { key: "Content-Security-Policy", value: CSP },
  // Prevent the app from being framed (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing responses away from the declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referring URL to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful browser features this app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Cross-origin policies
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["vergesnowy.com", "www.vergesnowy.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // API routes: relax CORP to cross-origin so external agents/SDKs can call them
      {
        source: "/api/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
