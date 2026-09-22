/**
 * Full-width integration marquee — matching mrdn.finance exactly
 * 4 rows of large 3-color scrolling text + 1 row of big clickable logos
 */

const networks = [
  { name: "Robinhood", logo: "/logos/robinhood.jpg", href: "https://robinhood.com" },
  { name: "Circle", logo: "/logos/circle.jpg", href: "https://www.circle.com" },
  { name: "Uniswap", logo: "/logos/uniswap.png", href: "https://uniswap.org" },
  { name: "Pons", logo: "/logos/pons.jpg", href: "https://ponsralph.xyz" },
  { name: "Morpho", logo: "/logos/morpho.jpg", href: "https://morpho.org" },
  { name: "Chainlink", logo: "/logos/chainlink.jpg", href: "https://chain.link" },
  { name: "LayerZero", logo: "/logos/layerzero.jpg", href: "https://layerzero.network" },
  { name: "Alchemy", logo: "/logos/alchemy.jpg", href: "https://alchemy.com" },
  { name: "Synthetix", logo: "/logos/synthetix.png", href: "https://synthetix.io" },
  { name: "EigenLayer", logo: "/logos/eigenlayer.png", href: "https://eigenlayer.xyz" },
];

function LogoItem({ name, logo, href }: { name: string; logo: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 md:gap-4 shrink-0 whitespace-nowrap group"
    >
      <img
        src={logo}
        alt={name}
        className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full object-contain"
      />
      <span className="text-3xl md:text-4xl lg:text-5xl font-medium text-white/90 group-hover:text-emerald-400 transition-colors">
        {name}
      </span>
    </a>
  );
}

function ScrollingText({ direction = "left", speed = "60s" }: { direction?: "left" | "right"; speed?: string }) {
  const items = Array.from({ length: 10 });
  const animClass = direction === "left" ? "ticker-track" : "ticker-track-rev";

  return (
    <div
      className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      <div className={`${animClass} gap-8 md:gap-14`} style={{ ["--ticker-speed" as string]: speed }}>
        {[...items, ...items].map((_, i) => (
          <span
            key={i}
            className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-light whitespace-nowrap shrink-0 select-none tracking-tight leading-[1.1]"
          >
            <span className="text-white/[0.3]">Robinhood </span>
            <span className="text-emerald-400/[0.4] font-medium">x402</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function IntegrationMarquee() {
  const logoQuad = [...networks, ...networks, ...networks, ...networks];

  return (
    <section className="bg-[#12231F] py-6 md:py-10 relative z-20 overflow-hidden">
      {/* Row 1: text scroll left */}
      <ScrollingText direction="left" speed="50s" />

      {/* Row 2: text scroll right */}
      <ScrollingText direction="right" speed="55s" />

      {/* Row 3: BIG LOGO CHIPS — clickable, no pill bg, scroll left */}
      <div
        className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden my-3 md:my-5"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
        }}
      >
        <div className="ticker-track gap-8 md:gap-14" style={{ ["--ticker-speed" as string]: "40s" }}>
          {logoQuad.map((n, i) => (
            <LogoItem key={`logo-${i}`} {...n} />
          ))}
        </div>
      </div>

      {/* Row 4: text scroll left */}
      <ScrollingText direction="left" speed="58s" />

      {/* Row 5: text scroll right */}
      <ScrollingText direction="right" speed="52s" />
    </section>
  );
}
