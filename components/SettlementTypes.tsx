import Reveal from "@/components/Reveal";

export default function SettlementTypes() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5 max-w-[680px]">
            Two modes.{" "}
            <span className="text-gray-400">Pick what fits.</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-12 max-w-[600px]">
            Instant for real-time agent flows. Batched for high-volume, low-cost workloads.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Instant */}
          <Reveal delay={200}>
            <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-[#2a2a2e]">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-emerald-400 font-mono text-[22px] font-bold">&lt;2s</span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gray-500">settlement</span>
              </div>
              <h3 className="text-[24px] font-medium text-white mb-3">
                Instant
              </h3>
              <ul className="space-y-3 text-[14px] text-gray-400 leading-[1.5]">
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>USDG + ETH supported</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Per-request settlement</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>0.5% facilitator fee</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Cashback rewards eligible</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Best for real-time AI agents</li>
              </ul>
            </div>
          </Reveal>

          {/* Batched */}
          <Reveal delay={300}>
            <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-[#2a2a2e]">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-emerald-400 font-mono text-[22px] font-bold">0%</span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gray-500">fee</span>
              </div>
              <h3 className="text-[24px] font-medium text-white mb-3">
                Batched
              </h3>
              <ul className="space-y-3 text-[14px] text-gray-400 leading-[1.5]">
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>USDG only</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Aggregated settlement</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>No facilitator fee</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Ideal for high-volume scraping</li>
                <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#x2713;</span>Cross-chain via LayerZero</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
