import Reveal from "@/components/Reveal";

const facts = [
  { num: "400ms",   label: "Robinhood block time",   body: "Fast enough that a 402 → pay → retry round-trip feels synchronous." },
  { num: "$0.0001", label: "Average tx fee",      body: "Stripe's network fee on a $0.001 call would be infinite. Robinhood's is zero." },
  { num: "65k TPS", label: "Network capacity",    body: "Spawn 10,000 agent micropayments per second without queueing." },
  { num: "1 RPC",   label: "BYO infrastructure",  body: "Plug in Alchemy, Infura, or run your own node. No Verge lock-in." },
];

export default function WhyBase() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="max-w-[680px] mb-12 md:mb-14">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              Other chains are too slow{" "}
              <br className="hidden sm:block" />
              <span className="text-gray-400">or too expensive.</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              x402 is interesting on every chain. It&rsquo;s only{" "}
              <em className="text-emerald-400 not-italic font-medium">useful</em> on Robinhood.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 100}>
              <div className="bg-[#1B1B1C] rounded-[20px] p-6 border border-[#2a2a2e]">
                <div className="text-emerald-400 text-[clamp(34px,4vw,48px)] font-light mb-3 leading-none">{f.num}</div>
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-gray-500 mb-3">
                  {f.label}
                </div>
                <p className="text-[14px] text-gray-400 leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
