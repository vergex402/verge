/** @type {import('next').NextConfig} */
const securityHeaders = [
  // HSTS: force HTTPS for a year, include subdomains, eligible for browser preload lists.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Prevent the app from being framed (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing responses away from the declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referring URL to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful browser features this app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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
    ];
  },
};
module.exports = nextConfig;
