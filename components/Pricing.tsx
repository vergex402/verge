import Reveal from "@/components/Reveal";

const rows: Array<{
  label: string;
  verge: string;
  stripe: string;
  selfhost: string;
  vergeBold?: boolean;
}> = [
  { label: "Facilitator fee", verge: "0.5%",    stripe: "2.9% + $0.30", selfhost: "0% (you self-host)", vergeBold: true },
  { label: "Settlement",      verge: "~400ms",  stripe: "1–3 days",     selfhost: "~12s" },
  { label: "Network fee",     verge: "~$0.0001",stripe: "—",            selfhost: "$0.05–2.00" },
  { label: "Min transaction", verge: "$0.001",  stripe: "$0.50",        selfhost: "—" },
  { label: "Currency",        verge: "USDG, ETH",stripe: "USD/EUR/…",   selfhost: "USDG, ETH" },
  { label: "Crypto-native",   verge: "✓",       stripe: "—",            selfhost: "✓" },
  { label: "Self-host",       verge: "✓",       stripe: "—",            selfhost: "✓" },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-[#171719] py-20 md:py-32 relative z-20">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="max-w-[680px] mb-12 md:mb-14">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              Built for{" "}
              <span className="bg-emerald-500 text-black px-1.5 md:px-2 py-0.5 rounded font-semibold inline-block">
                $0.001
              </span>{" "}
              transactions.
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Stripe takes 2.9% + $0.30. That breaks at &lt;$1 per call. We don&rsquo;t.
            </p>
          </div>
        </Reveal>

        {/* 3 pricing tiers */}
        <div className="grid md:grid-cols-3 gap-5 mb-12 md:pt-3">
          {/* Verge — recommended */}
          <Reveal delay={100}>
            <div className="relative">
              <span className="absolute -top-3 left-6 z-10 bg-emerald-500 text-black text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                recommended
              </span>
              <div className="bg-[#1B1B1C] rounded-[20px] p-7 border border-emerald-500/30 shadow-[0_0_40px_-12px_rgba(52,211,153,0.2)]">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[18px] font-medium text-white">verge</span>
                  <span className="text-gray-500 text-[12px] font-mono">facilitator</span>
                </div>
                <div className="text-emerald-400 text-[clamp(34px,4vw,48px)] font-light mb-1 leading-none">0.5%</div>
                <div className="text-gray-500 text-[13px] font-mono mb-6">per settled request</div>
                <ul className="space-y-2 text-[14px] text-gray-400 leading-[1.55]">
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span><span>400ms USDG settlement on Robinhood</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span><span>Nonce-signed challenges, replay-safe</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span><span>Express, Hono, Fastify SDKs</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span><span>Self-host with BYO Robinhood RPC</span></li>
                </ul>
              </div>
            </div>
          </Reveal>

          {/* Stripe */}
          <Reveal delay={200}>
            <div className="bg-[#1B1B1C] rounded-[20px] p-7 border border-[#2a2a2e] opacity-60">
              <div className="text-[18px] font-medium text-white mb-2">stripe</div>
              <div className="text-gray-400 text-[clamp(34px,4vw,48px)] font-light mb-1 leading-none">2.9%</div>
              <div className="text-gray-500 text-[13px] font-mono mb-6">+ $0.30 per transaction</div>
              <ul className="space-y-2 text-[14px] text-gray-500 leading-[1.55]">
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>Bank rails, 1–3 day settle</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>Min $0.50 makes &lt;$1 calls a loss</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>KYC / business account required</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>No machine-to-machine auth</span></li>
              </ul>
            </div>
          </Reveal>

          {/* Self-host */}
          <Reveal delay={300}>
            <div className="bg-[#1B1B1C] rounded-[20px] p-7 border border-[#2a2a2e] opacity-75">
              <div className="text-[18px] font-medium text-white mb-2">self-host</div>
              <div className="text-emerald-400 text-[clamp(34px,4vw,48px)] font-light mb-1 leading-none">0%</div>
              <div className="text-gray-500 text-[13px] font-mono mb-6">+ your infra costs</div>
              <ul className="space-y-2 text-[14px] text-gray-500 leading-[1.55]">
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>Run @vergex402/express or @vergex402/hono yourself</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>BYO Robinhood RPC (Alchemy / QuickNode)</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>You verify on-chain, you settle</span></li>
                <li className="flex gap-2"><span className="shrink-0">&mdash;</span><span>Open source, MIT licensed</span></li>
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Comparison table */}
        <Reveal delay={350}>
          <div className="rounded-[20px] border border-[#2a2a2e] overflow-x-auto bg-[#1B1B1C]">
            <table className="w-full text-[13px] md:text-[14px] font-mono" style={{ tableLayout: "fixed", minWidth: 640 }}>
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2a2a2e]" style={{ background: "#222224" }}>
                  <th className="text-left px-4 md:px-6 py-4 font-medium text-gray-500 text-[11px] tracking-[0.18em] uppercase">vs.</th>
                  <th className="text-left px-4 md:px-6 py-4 font-medium text-emerald-400 text-[11px] tracking-[0.18em] uppercase">verge</th>
                  <th className="text-left px-4 md:px-6 py-4 font-medium text-gray-500 text-[11px] tracking-[0.18em] uppercase">stripe</th>
                  <th className="text-left px-4 md:px-6 py-4 font-medium text-gray-500 text-[11px] tracking-[0.18em] uppercase">L1/L2 native</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-[#2a2a2e] last:border-none transition-colors hover:bg-[#222224]">
                    <td className="px-4 md:px-6 py-3.5 text-gray-400 whitespace-normal break-words">{r.label}</td>
                    <td className="px-4 md:px-6 py-3.5 whitespace-normal break-words">
                      <span className={r.vergeBold ? "text-emerald-400 font-semibold" : "text-white font-medium"}>{r.verge}</span>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-gray-400 whitespace-normal break-words">{r.stripe}</td>
                    <td className="px-4 md:px-6 py-3.5 text-gray-400 whitespace-normal break-words">{r.selfhost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
