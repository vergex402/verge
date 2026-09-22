"use client";

import { useEffect, useState } from "react";

const steps = [
  { key: "request", label: "GET /api/premium" },
  { key: "402", label: "402 Payment Required" },
  { key: "pay", label: "Pay 0.001 USDG" },
  { key: "verify", label: "Verify on Robinhood Chain" },
  { key: "unlocked", label: "200 · unlocked" },
] as const;

/** Small looping visual of the x402 request → challenge → pay → unlock cycle. */
export default function PaymentFlowMini() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % steps.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {steps.map((step, i) => {
        const state = i < active ? "done" : i === active ? "active" : "pending";
        return (
          <div key={step.key} className="flex items-center gap-1.5 shrink-0">
            <div
              className={[
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono transition-all duration-300",
                state === "done" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
                state === "active" && "border-emerald-400 bg-emerald-500/15 text-emerald-300 scale-105",
                state === "pending" && "border-[#2a2a2e] bg-[#171719] text-gray-600",
              ].filter(Boolean).join(" ")}
            >
              <span
                className={[
                  "size-1.5 rounded-full",
                  state === "done" && "bg-emerald-400",
                  state === "active" && "bg-emerald-300 animate-pulse",
                  state === "pending" && "bg-gray-700",
                ].filter(Boolean).join(" ")}
              />
              {step.label}
            </div>
            {i < steps.length - 1 && <span className="text-gray-700 text-xs">→</span>}
          </div>
        );
      })}
    </div>
  );
}
