import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Changelog — Verge",
  description: "What's shipped in Verge — the HTTP 402 payment gateway.",
};

const ENTRIES = [
  {
    date: "2026-09-25",
    version: "0.7",
    tag: "SHIPPED",
    items: [
      "Webhooks — register HTTP callbacks for payment.settled and endpoint.called events; HMAC-signed payloads",
      "Invoice / payment links — shareable /pay/<id> pages, single-use, expiry-aware, payable by wallet or agent",
      "API key expiry + label — set a TTL and a human label on any API key; enforced atomically on use",
      "Public reputation profiles — /r/<address> shows on-chain score, tier, settled count, tx anchors",
      "Changelog — this page",
      "Trust page — /trust documents exactly what Verge stores and what it never sees",
    ],
  },
  {
    date: "2026-09-25",
    version: "0.6",
    tag: "SHIPPED",
    items: [
      "$VERGE token page at /verge — tier table, fee discounts, what it does/doesn't, CA, Pons link",
      "Fee tier banner in /app dashboard — live $VERGE balance + tier read from chain on connect",
      "NavBar $VERGE link now points to /verge",
      "Earnings chart (30 days) — bar chart of daily USDG from payments_log",
      "Extended metrics — conversion rate, unique payers, today's earnings, avg payment",
      "Workbench drawer — in-browser terminal at bottom of /app; inspect <url>, curl, help, history",
      "/api/workbench — server-side command runner; parses 402 challenges without spending",
      "payments_log table — every settlement logged with wallet, payer, amount, endpoint_id",
    ],
  },
  {
    date: "2026-09-24",
    version: "0.5",
    tag: "SHIPPED",
    items: [
      "Agent wallets — generate EVM keypairs on Robinhood Chain, private key shown once, stored in vault",
      "Credential vault — AES-256-GCM encrypted secrets, wallet-scoped, template {{name}} references",
      "Reputation system — 0-100 score from on-chain settled payments (log-scale count + volume + recency)",
      "Live Data Feeds tab — news, trending pools, whale liquidity, momentum signals (60s cache)",
      "Agent wallets private key hidden by default — click-to-reveal, never appears in screenshots",
    ],
  },
  {
    date: "2026-09-24",
    version: "0.4",
    tag: "SHIPPED",
    items: [
      "Security hardening — atomic replay guard, rate limits, SSRF/DNS-rebind protection",
      "Security headers — CSP, X-Frame-Options, HSTS on all responses",
      "Atomic API key quota — single-UPDATE race-safe daily quota enforcement",
    ],
  },
  {
    date: "2026-09-23",
    version: "0.3",
    tag: "SHIPPED",
    items: [
      "x402 v2 wire compatibility — dual-dialect: PAYMENT-REQUIRED + legacy WWW-Authenticate simultaneously",
      "Hosted facilitator — /api/facilitator/supported, /verify, /settle (spec §7.1–7.3), zero protocol fee",
      "Hosted endpoints (/x/[slug]) — publish a paid API without running a server; Verge proxies to real upstream",
      "7 marketplace templates — jokes, quotes, crypto-price, news, alerts, whale-alerts, signals",
    ],
  },
  {
    date: "2026-09-22",
    version: "0.2",
    tag: "SHIPPED",
    items: [
      "Wallet-authenticated developer console at /app (Reown / Robinhood Chain 4663)",
      "API key management — create, list, revoke; X-API-Key gateway auth",
      "Verified endpoint marketplace — publish self-hosted or hosted endpoints, health-check on add",
      "Transaction history — on-chain USDG Transfer scan",
      "Receipts — settlement proofs with explorer links",
      "Interactive live x402 demo tab",
      "Payment rails directory (7 networks)",
      "Command palette (⌘K)",
    ],
  },
  {
    date: "2026-09-22",
    version: "0.1",
    tag: "SHIPPED",
    items: [
      "HTTP 402 Express middleware (@vergex402/express)",
      "HTTP 402 Hono adapter (@vergex402/hono)",
      "Shared verifier core (@vergex402/core) — EVM, Solana, Sui rails",
      "Landing site (vergesnowy.com) — hero, pricing, docs, payment rails",
      "Developer docs at /docs — full guide, quickstart, API reference",
    ],
  },
] as const;

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] text-emerald-300">
      {tag}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <main className="bg-[#171719] min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-3xl px-5 pt-28 pb-20">
        <span className="inline-block rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 mb-6">
          What ships
        </span>
        <h1 className="font-[var(--font-display)] text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-[64px]">
          Changelog
        </h1>
        <p className="mt-4 text-[17px] leading-7 text-white/45">
          Every release, in order. No marketing copy — just what changed and when.
        </p>

        <div className="mt-14 space-y-12">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="grid gap-6 md:grid-cols-[160px_1fr]">
              {/* Left: date + version */}
              <div className="md:pt-1">
                <div className="font-mono text-[11px] text-white/35">{entry.date}</div>
                <div className="mt-1 font-mono text-xs font-semibold text-white/60">v{entry.version}</div>
                <div className="mt-2"><TagBadge tag={entry.tag} /></div>
              </div>
              {/* Right: items */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#1a1c1b] p-5">
                <ul className="space-y-2.5">
                  {entry.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-white/60">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-300/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
