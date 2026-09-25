import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Trust & Transparency — Verge",
  description: "Exactly what Verge stores, what it never sees, and what happens on a legal request.",
};

const STORES = [
  ["Wallet session tokens", "Issued on wallet signature, expiry-bound, stored as a hash. Used to authenticate /app actions."],
  ["API key hashes", "SHA-256 of the raw key only. The plaintext is shown once at creation and never stored."],
  ["Endpoint metadata", "Name, URL, price, network, health status. Needed to serve the marketplace and hosted endpoints."],
  ["payments_log rows", "wallet (recipient), payer_address, amount_usdg, endpoint_id, settled_at. Revenue accounting."],
  ["Reputation scores", "Derived from settled payment counts and volume per address. Sourced entirely from on-chain tx hashes."],
  ["Vault entries", "AES-256-GCM encrypted blobs — we store ciphertext, IV and tag only. Plaintext is never written."],
  ["Agent wallet addresses", "Public address + label + vault reference. Private keys are stored encrypted in the vault above."],
  ["Webhook registrations", "URL, event subscriptions, HMAC secret hash. Used to deliver payment callbacks."],
  ["Invoice records", "Description, amount, network, status, payer address after settlement. Needed to detect double-pay."],
  ["Audit log", "Append-only log of security-sensitive actions (key created/revoked, session created, endpoint published). Never raw keys."],
  ["RPC and API request logs", "Standard access logs retained for 30 days for abuse prevention. IP, timestamp, status code — no body content."],
] as const;

const NEVER = [
  ["Wallet private keys", "Never transmitted to Verge. Agent wallet private keys are encrypted client-side before vaulting."],
  ["API key plaintext after creation", "Shown once on creation, then dropped. We store only the SHA-256 hash."],
  ["Vault secret plaintext", "AES-256-GCM encrypted before storage. The decryption key (VERGE_VAULT_KEY) is an env secret we don't log."],
  ["x402 payment content", "On-chain tx hashes are recorded; we do not store what data was returned by paid endpoints."],
  ["Full transaction history", "We scan on-chain Transfer events on-demand for your address; we don't maintain a shadow ledger."],
  ["User identity / KYC", "Verge has no identity layer. Wallet address is the only identifier."],
  ["Cross-wallet linkage", "Each wallet session is isolated. We don't correlate addresses or build profiles."],
] as const;

const LEGAL = `Verge complies with valid legal process. Because private keys, secret values, and vault plaintext are never held in recoverable form, we cannot produce them under compulsion. What we can produce is limited to the data in the "What Verge stores" table above: session records, hashed keys, endpoint metadata, payment logs, and access logs. We cannot reconstruct vault secrets, API key values, or private keys — not because of policy, but because they don't exist on our servers in recoverable form.`;

export default function TrustPage() {
  return (
    <main className="bg-[#171719] min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-4xl px-5 pt-28 pb-20">
        <span className="inline-block rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 mb-6">
          Transparency
        </span>
        <h1 className="font-[var(--font-display)] text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-[64px]">
          Trust & data.
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-7 text-white/50 md:text-[19px]">
          Exactly what Verge stores, what it is architecturally incapable of seeing, and what happens if we receive a legal request.
        </p>

        {/* What we store */}
        <section className="mt-14">
          <h2 className="mb-5 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-white">
            What Verge stores
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="hidden grid-cols-[1fr_2fr] gap-4 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.15em] text-white/30 md:grid">
              <span>Data</span><span>Purpose / detail</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {STORES.map(([item, detail]) => (
                <div key={item} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_2fr] md:gap-4 md:items-start">
                  <div className="text-sm font-medium text-white/80">{item}</div>
                  <div className="text-[12px] leading-5 text-white/45">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we never see */}
        <section className="mt-12">
          <h2 className="mb-5 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-white">
            What Verge is built never to see
          </h2>
          <div className="overflow-hidden rounded-2xl border border-emerald-200/10 bg-emerald-200/[0.025]">
            <div className="divide-y divide-white/[0.05]">
              {NEVER.map(([item, reason]) => (
                <div key={item} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_2fr] md:gap-4 md:items-start">
                  <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-[9px] text-emerald-300">✓</span>
                    {item}
                  </div>
                  <div className="text-[12px] leading-5 text-white/45">{reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Legal requests */}
        <section className="mt-12">
          <h2 className="mb-5 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-white">
            Legal requests
          </h2>
          <div className="rounded-2xl border border-white/[0.07] bg-[#1a1c1b] p-6">
            <p className="text-sm leading-7 text-white/55">{LEGAL}</p>
          </div>
        </section>

        {/* Security */}
        <section className="mt-12">
          <h2 className="mb-5 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-white">
            Security practices
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Vault encryption", "AES-256-GCM with a server-side key (VERGE_VAULT_KEY). Each entry has a unique IV."],
              ["API keys", "SHA-256 hashed before storage. Atomic daily quota via single-UPDATE to prevent races."],
              ["Replay protection", "Nonce + tx-hash replay guard in Postgres (x402_settlements, x402_nonces tables)."],
              ["Rate limits", "Per-IP rate limiting on all mutating endpoints. 60/min workbench, 30/min key verification."],
              ["Webhook signatures", "HMAC-SHA256 with per-webhook secret. X-Verge-Signature: sha256=<hex> header."],
              ["SSRF protection", "Private IP ranges blocked on all URL-accepting endpoints (marketplace, workbench, webhooks)."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs font-semibold text-white/80">{title}</div>
                <p className="mt-1.5 text-[11px] leading-5 text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-xl border border-white/[0.06] bg-white/[0.015] px-5 py-4 text-[11px] text-white/30">
          Questions or security disclosures? Open an issue on{" "}
          <a href="https://github.com/vergex402/verge" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white/70 underline underline-offset-2">
            GitHub
          </a>.
        </div>
      </div>
      <Footer />
    </main>
  );
}
