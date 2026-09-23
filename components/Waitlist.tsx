"use client";

import { useAccount } from "wagmi";
import WalletButton from "@/components/WalletButton";

export default function Waitlist() {
  const { address } = useAccount();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <section id="connect" className="relative z-20 overflow-hidden bg-[#171719] py-20 md:py-28">
      <div aria-hidden className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
      <div className="mx-auto max-w-[860px] px-6 text-center">
        <div className="mb-5 inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[0.04] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-emerald-100/70">
          WALLET ACCOUNT · API ACCESS · PAYMENT RAILS
        </div>
        <h2 className="mx-auto max-w-[700px] text-3xl font-light leading-[1.05] tracking-[-0.04em] text-white md:text-5xl lg:text-6xl">
          Open the <span className="inline-block rounded bg-emerald-400 px-2 py-0.5 font-semibold text-black">Verge console</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[620px] text-sm leading-6 text-gray-400 md:text-base">
          Browse docs and payment rails without signing in. Connect on Robinhood Chain only when you need private tools: endpoint publishing, API keys, receipts, and wallet-scoped settlement history.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="/app" className="inline-flex min-w-[168px] items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#07110c] transition hover:bg-emerald-200">
            Open console →
          </a>
          <WalletButton className="mx-auto sm:mx-0" />
          <a href="/docs" className="inline-flex min-w-[168px] items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white">
            Read docs
          </a>
        </div>

        <div className="mt-6 text-[13px] text-gray-500">
          {address ? `Connected as ${short}. Your wallet is the account — no email or password.` : "WalletConnect QR and browser wallets supported. The console stays readable before connect."}
        </div>
        <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
          {[
            ["Default rail", "Robinhood Chain 4663 · USDG"],
            ["SDK switch", "Set network: \"base-mainnet\" etc."],
            ["x402 use", "Agents or apps pay per API call"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">{label}</div>
              <div className="mt-2 text-sm text-white/75">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
