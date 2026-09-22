import Reveal from "@/components/Reveal";

const partners = [
  { name: "Robinhood" },
  { name: "Circle" },
  { name: "Alchemy" },
  { name: "x402.org" },
  { name: "Uniswap" },
  { name: "Pons" },
];

export default function Ecosystem() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
            Building with the{" "}
            <span className="text-emerald-400">best in Robinhood.</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-14 max-w-[520px] mx-auto">
            Verge integrates with the top Robinhood infrastructure providers.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-[720px] mx-auto mb-14">
          {partners.map((p, i) => (
            <Reveal key={p.name} delay={100 + i * 60}>
              <div className="bg-[#1B1B1C] rounded-[20px] p-5 text-center border border-[#2a2a2e]">
                <span className="text-gray-300 text-[13px] font-medium tracking-[0.04em]">
                  {p.name}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={400}>
          <p className="text-gray-400 text-[15px] mb-6">
            Want to integrate with Verge?
          </p>
          <a
            href="/app"
            className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors inline-block"
          >
            Join the x402 Initiative &rarr;
          </a>
        </Reveal>
      </div>
    </section>
  );
}
