import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// metadataBase points at the live deployment so OG image URLs resolve.
// When verge.so / verge402.xyz domain ships, swap this constant.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Verge HTTP 402 for AI agents. Settle in 400ms.",
  description:
    "Robinhood-native facilitator for HTTP 402 micropayments. Stripe-clean SDK, 0.5% facilitator fee, USDG settled in 400ms.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Verge — HTTP 402 for AI agents",
    description: "Robinhood-native micropayments. Settled in 400ms.",
    type: "website",
    url: SITE_URL,
    siteName: "Verge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verge — HTTP 402 for AI agents",
    description: "Robinhood-native micropayments. Settled in 400ms.",
    site: "@verge402",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
