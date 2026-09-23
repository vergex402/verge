import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// metadataBase points at the live deployment so OG image URLs resolve.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Verge — Multichain HTTP 402 payment rails.",
  description:
    "Multichain HTTP 402 payment gateway for software and AI agents. USDG on Robinhood Chain; USDC across Ethereum, Base, Arbitrum, Polygon, Solana and Sui.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Verge — HTTP 402 for AI agents",
    description: "Multichain HTTP 402 payments. USDG on Robinhood Chain; USDC across six additional supported rails.",
    type: "website",
    url: SITE_URL,
    siteName: "Verge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verge — HTTP 402 for AI agents",
    description: "Multichain HTTP 402 payments. USDG on Robinhood Chain; USDC across six additional supported rails.",
    site: "@vergesnowyx402",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/hero-fast.webp" as="image" type="image/webp" fetchPriority="high" />
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
