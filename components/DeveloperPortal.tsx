"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Transactions" },
  { id: "marketplace", label: "Marketplace" },
  { id: "receipts", label: "Receipts" },
  { id: "apikeys", label: "API Keys" },
];

const tabContent: Record<string, { title: string; items: string[] }> = {
  dashboard: {
    title: "Real-time overview of your x402 endpoints",
    items: ["Total revenue earned", "Active endpoints count", "Settlement status", "Network health"],
  },
  transactions: {
    title: "Every payment, every settlement, every detail",
    items: ["Transaction hash + explorer link", "Amount + fee breakdown", "Sender wallet address", "Timestamp + block confirmation"],
  },
  marketplace: {
    title: "Discover and list paid API endpoints",
    items: ["Browse available x402 endpoints", "List your own endpoints", "Price comparison", "Usage analytics"],
  },
  receipts: {
    title: "On-chain proof for every payment",
    items: ["Verifiable settlement receipts", "Refund status tracking", "Export for accounting", "Webhook notifications"],
  },
  apikeys: {
    title: "Manage your facilitator credentials",
    items: ["Generate new API keys", "Key rotation schedule", "Usage limits per key", "IP allowlists"],
  },
};

export default function DeveloperPortal() {
  const [active, setActive] = useState("dashboard");
  const content = tabContent[active];

  return (
    <section className="bg-[#1B2824] py-20 md:py-32 relative z-20 overflow-hidden rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      {/* Subtle topographic texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='4' seed='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "400px 400px",
        }}
      />

      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              <span className="bg-emerald-500 text-black px-1.5 md:px-2 py-0.5 rounded font-semibold inline-block">
                Developer
              </span>{" "}
              Portal
            </h2>
            <p className="text-gray-400 text-sm md:text-base max-w-[600px] mx-auto">
              Comprehensive tools for managing your x402 infrastructure
            </p>
          </div>
        </Reveal>

        <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] lg:rounded-[32px] overflow-hidden border border-[#2a2a2e]">
          {/* Tab bar */}
          <div className="border-b border-[#2a2a2e] px-4 md:px-8">
            <div className="flex overflow-x-auto gap-1 py-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    active === t.id
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="text-xs">{active === t.id ? "−" : "+"}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: description */}
            <div className="p-6 md:p-8 lg:p-12">
              <Reveal>
                <h3 className="text-xl md:text-2xl font-light text-white mb-4">
                  {content.title}
                </h3>
                <div className="space-y-3">
                  {content.items.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-emerald-400 text-sm">&#x2713;</span>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right: mock dashboard */}
            <div className="p-4 md:p-6 lg:p-8">
              <div className="bg-[#131315] rounded-[20px] p-5 border border-[#222226] min-h-[280px]">
                {/* Mock stats row */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Revenue", val: "$20.11" },
                    { label: "Txns", val: "$18.01" },
                    { label: "Endpoints", val: "192" },
                    { label: "Avg fee", val: "$7" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-emerald-400 text-sm font-medium">{s.val}</div>
                      <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mock table rows */}
                <div className="space-y-2">
                  {[
                    { hash: "5K4f…3Ax", amount: "$0.005", status: "settled", time: "2s ago" },
                    { hash: "8Bb2…9Yz", amount: "$0.010", status: "settled", time: "14s ago" },
                    { hash: "3Cc7…1Wq", amount: "$0.001", status: "pending", time: "28s ago" },
                    { hash: "7Dd1…4Rp", amount: "$0.050", status: "settled", time: "1m ago" },
                  ].map((tx) => (
                    <div key={tx.hash} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1B1B1C] text-[12px] font-mono">
                      <span className="text-gray-300">{tx.hash}</span>
                      <span className="text-white">{tx.amount}</span>
                      <span className={tx.status === "settled" ? "text-emerald-400" : "text-amber-400"}>{tx.status}</span>
                      <span className="text-gray-500">{tx.time}</span>
                    </div>
                  ))}
                </div>

                {/* Mock receipt card */}
                <div className="mt-4 bg-[#171719] rounded-xl p-4 border border-[#2a2a2e]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">Receipt</span>
                    <span className="text-emerald-400 text-[11px] font-medium">Confirmed</span>
                  </div>
                  <div className="text-white text-sm font-medium">$0.005 USDG</div>
                  <div className="text-gray-500 text-[11px] font-mono mt-1">→ 7Aa3…q9Px on Robinhood</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
