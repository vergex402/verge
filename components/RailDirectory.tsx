"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/components/AppIcon";

type Rail = { id: string; name: string; chainId: number | null; asset: string; tokenContract: string; explorerUrl: string };
const logos: Record<string, string> = {
  "robinhood-mainnet": "/logos/robinhood.jpg",
  "ethereum-mainnet": "/chains/ethereum.png",
  "base-mainnet": "/chains/base.png",
  "arbitrum-mainnet": "/chains/arbitrum.png",
  "polygon-mainnet": "/chains/polygon.svg",
  "solana-mainnet": "/chains/solana.png",
  "sui-mainnet": "/chains/sui.png",
};
const labels: Record<string, string> = {
  "robinhood-mainnet": "Default Verge rail",
  "ethereum-mainnet": "EVM opt-in",
  "base-mainnet": "EVM opt-in",
  "arbitrum-mainnet": "EVM opt-in",
  "polygon-mainnet": "EVM opt-in",
  "solana-mainnet": "SVM opt-in",
  "sui-mainnet": "Move opt-in",
};

export function useSupportedRails() {
  const [rails, setRails] = useState<Rail[]>([]);
  useEffect(() => {
    let live = true;
    fetch("/api/catalog").then(async (r) => { if (!r.ok) throw new Error("Catalog unavailable"); return r.json(); })
      .then((d) => { if (live && Array.isArray(d.supportedRails)) setRails(d.supportedRails); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return rails;
}

export default function RailDirectory() {
  const rails = useSupportedRails();
  return <div>
    <div className="mb-6 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border border-amber-200/10 bg-amber-100/[0.035] p-4 text-xs leading-5 text-white/50">
        <strong className="font-medium text-amber-100/80">Transparent coverage:</strong> all listed rails are in the public SDK registry. The wallet console currently reads private balances and settlement history from Robinhood Chain only.
      </div>
      <div className="rounded-2xl border border-emerald-200/10 bg-emerald-200/[0.035] p-4 text-xs leading-5 text-white/55">
        <strong className="font-medium text-emerald-100/85">How to choose a chain:</strong> keep the default for Robinhood/USDG, or pass a different <code className="rounded bg-black/20 px-1 text-white/70">network</code> string in the SDK. No separate command is needed.
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rails.map((rail) => <article key={rail.id} className={`rounded-2xl border p-4 transition hover:border-white/15 ${rail.id === "robinhood-mainnet" ? "border-emerald-200/15 bg-emerald-200/[0.035]" : "border-white/[0.07] bg-white/[0.02]"}`}>
        <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 p-2.5"><img src={logos[rail.id] ?? "/verge-logo.jpeg"} alt="" className="size-full object-contain"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-white/90">{rail.name}</h3><span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-0.5 font-mono text-[8px] tracking-wider text-white/45">{labels[rail.id] || "supported"}</span></div><p className="mt-1 truncate font-mono text-[10px] text-white/35">{rail.chainId == null ? rail.id.startsWith("solana") ? "Solana mainnet · SVM" : "Sui mainnet · Move" : `Chain ID ${rail.chainId} · EVM`}</p></div></div>
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-mono text-[10px] text-white/70">{rail.asset}</span><a href={rail.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-white/40 transition hover:text-emerald-200">Explorer <AppIcon name="arrow" size={12}/></a></div>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-3 font-mono text-[10px] leading-4 text-white/48">{`paywall({\n  amount: 0.001,\n  recipient: process.env.WALLET,\n  network: "${rail.id}"\n})`}</pre>
        <div className="mt-3 break-all font-mono text-[9px] leading-4 text-white/25" title={rail.tokenContract}>{rail.tokenContract}</div>
      </article>)}
      {rails.length === 0 && <div className="col-span-full rounded-2xl border border-white/[0.07] p-8 text-center text-xs text-white/40">Loading supported payment rails…</div>}
    </div>
  </div>;
}
