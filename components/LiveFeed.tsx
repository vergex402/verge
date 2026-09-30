"use client";

import { useEffect, useRef, useState } from "react";

interface Settlement {
  id?: string;
  receiptUrl?: string | null;
  amountUsdg: number;
  network: string;
  endpointName: string | null;
  truncatedPayer: string | null;
  settledAt: string;
}


function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function NetworkPill({ network }: { network: string }) {
  const label = network === "robinhood-mainnet" ? "Robinhood" : network.split("-")[0];
  const cls = network === "robinhood-mainnet"
    ? "text-emerald-300/80 border-emerald-400/20 bg-emerald-400/[0.06]"
    : "text-blue-300/70 border-blue-400/20 bg-blue-400/[0.06]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.12em] uppercase ${cls}`}>
      <span className="size-1 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

export default function LiveFeed() {
  const [events, setEvents] = useState<Settlement[]>([]);
  const [live, setLive] = useState(false);
  const [totalToday, setTotalToday] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let alive = true;

    const connect = () => {
      try {
        es = new EventSource("/api/feed");
        es.addEventListener("connected", () => { if (alive) setLive(true); });
        es.addEventListener("history", (e) => {
          if (!alive) return;
          try { setEvents(JSON.parse(e.data) as Settlement[]); } catch { /* ignore */ }
        });
        es.addEventListener("settlement", (e) => {
          if (!alive) return;
          try {
            const data: Settlement = JSON.parse(e.data);
            setEvents(prev => [data, ...prev].slice(0, 30));
            setTotalToday(t => t + data.amountUsdg);
          } catch { /* ignore */ }
        });
        es.onerror = () => { es?.close(); setTimeout(connect, 5000); };
      } catch { /* SSE not supported in very old browsers */ }
    };

    connect();
    return () => { alive = false; es?.close(); };
  }, []);

  // Tick timestamps every 10s
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="live-feed" className="relative overflow-hidden bg-[#0e100f] py-16 md:py-24">
      {/* Grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(52,211,153,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,.03)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative mx-auto max-w-5xl px-5 md:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className={`size-2 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-white/40">
                {live ? "Live settlements" : "Recent settlements"}
              </span>
            </div>
            <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
              Money moving through Verge.<br />
              <span className="text-white/40">Right now.</span>
            </h2>
          </div>
          {totalToday > 0 && (
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-2.5 text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/50">This session</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-emerald-300">+{totalToday.toFixed(4)} USDG</div>
            </div>
          )}
        </div>

        {/* Feed list */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#111312] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_100px_70px] gap-0 border-b border-white/[0.06] px-4 py-2.5">
            {["Endpoint", "Amount", "Network", "When"].map(h => (
              <span key={h} className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">{h}</span>
            ))}
          </div>

          <ul ref={listRef} className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto scrollbar-none">
            {events.length === 0 ? (
              <li className="px-4 py-8 text-center font-mono text-[10px] text-white/30">
                {live ? "Connected — waiting for the next verified settlement." : "Connecting to verified settlement stream…"}
              </li>
            ) : events.map((ev, i) => (
              <li key={ev.id ?? `${ev.settledAt}-${i}`}
                className={`grid grid-cols-[1fr_80px_100px_70px] gap-0 px-4 py-3 transition-colors ${i === 0 && live ? "bg-emerald-400/[0.04]" : ""}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {i === 0 && live && (
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {ev.receiptUrl ? <a href={ev.receiptUrl} className="truncate font-mono text-[11px] text-emerald-300/90 hover:text-emerald-200" aria-label="View verified settlement receipt">{ev.endpointName ?? (ev.truncatedPayer || "Receipt")}</a> : <span className="truncate font-mono text-[11px] text-white/70">{ev.endpointName ?? (ev.truncatedPayer || "—")}</span>}
                </div>
                <span className="font-mono text-[11px] font-semibold text-emerald-300/90">
                  {ev.amountUsdg < 0.001 ? ev.amountUsdg.toFixed(6) : ev.amountUsdg.toFixed(4)}
                  <span className="ml-1 text-[9px] text-white/25">USDG</span>
                </span>
                <NetworkPill network={ev.network} />
                <span className="font-mono text-[10px] text-white/30">{timeAgo(ev.settledAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-white/20">
          Payer addresses truncated for privacy · amounts and endpoints are real-time
        </p>
      </div>
    </section>
  );
}
