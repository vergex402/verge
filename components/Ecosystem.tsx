import Reveal from "@/components/Reveal";

const partners = [
  { name: "Robinhood", logo: "/logos/robinhood.jpg", href: "https://robinhood.com" },
  { name: "Circle", logo: "/logos/circle.jpg", href: "https://www.circle.com" },
  { name: "Alchemy", logo: "/logos/alchemy.jpg", href: "https://www.alchemy.com" },
  { name: "x402.org", logo: "/logos/x402.svg", href: "https://www.x402.org" },
  { name: "Uniswap", logo: "/logos/uniswap.png", href: "https://uniswap.org" },
  { name: "Pons", logo: "/logos/pons.jpg", href: "https://ponsralph.xyz" },
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
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center gap-3 bg-[#1B1B1C] rounded-[20px] p-6 text-center border border-[#2a2a2e] hover:border-emerald-500/40 transition-colors"
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  className={`w-10 h-10 object-contain ${p.name === "x402.org" ? "opacity-90" : "rounded-full"}`}
                />
                <span className="text-gray-300 text-[13px] font-medium tracking-[0.04em] group-hover:text-white transition-colors">
                  {p.name}
                </span>
              </a>
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
