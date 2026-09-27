import Reveal from "@/components/Reveal";

const PACKAGES = [
  {
    name: "@vergex402/express",
    version: "0.5.0",
    desc: "Express middleware. Two lines to gate any route behind USDG payment.",
    badge: null,
    color: "border-white/[0.07] bg-white/[0.025]",
    accent: "text-white/70",
    install: "npm i @vergex402/express",
    use: "Server",
    href: "https://www.npmjs.com/package/@vergex402/express",
  },
  {
    name: "@vergex402/hono",
    version: "0.5.0",
    desc: "Hono adapter. Edge-compatible x402 paywall for Cloudflare Workers and Bun.",
    badge: null,
    color: "border-white/[0.07] bg-white/[0.025]",
    accent: "text-white/70",
    install: "npm i @vergex402/hono",
    use: "Server · Edge",
    href: "https://www.npmjs.com/package/@vergex402/hono",
  },
  {
    name: "@vergex402/fetch",
    version: "1.0.0",
    desc: "Buyer SDK. payAndFetch() handles the full 402 challenge-sign-retry loop for agents.",
    badge: null,
    color: "border-sky-300/20 bg-sky-300/[0.04]",
    accent: "text-sky-300/80",
    install: "npm i @vergex402/fetch",
    use: "Agent · Buyer",
    href: "https://www.npmjs.com/package/@vergex402/fetch",
  },
  {
    name: "@vergex402/ai-sdk",
    version: "1.0.0",
    desc: "Vercel AI SDK v7 middleware. wrapWith402() or createX402Gate() for any AI route.",
    badge: "NEW",
    color: "border-emerald-300/25 bg-emerald-300/[0.05]",
    accent: "text-emerald-300",
    install: "npm i @vergex402/ai-sdk",
    use: "AI routes · Agents",
    href: "https://www.npmjs.com/package/@vergex402/ai-sdk",
  },
];

export default function SdkSection() {
  return (
    <section className="bg-[#171719] py-20 md:py-28 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="mb-10 md:mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-white/35">
                NPM PACKAGES
              </div>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white">
                Four SDKs.<br />
                <span className="text-white/40">Every side of the payment.</span>
              </h2>
            </div>
            <a
              href="https://www.npmjs.com/search?q=%40vergex402"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-xs font-medium text-white/60 transition hover:border-emerald-300/30 hover:text-white md:self-auto"
            >
              Browse all on npm ↗
            </a>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg, i) => (
            <Reveal key={pkg.name} delay={i * 60}>
              <a
                href={pkg.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col h-full rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/30 ${pkg.color}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {pkg.badge && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 font-mono text-[8px] tracking-widest text-emerald-300 font-semibold">
                        {pkg.badge}
                      </span>
                    )}
                    <span className={`font-mono text-[10px] tracking-[0.1em] ${pkg.accent}`}>
                      v{pkg.version}
                    </span>
                  </div>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-white/35">
                    {pkg.use}
                  </span>
                </div>

                {/* Package name */}
                <div className="font-mono text-[12px] text-white/90 mb-2 break-all">
                  {pkg.name}
                </div>

                {/* Desc */}
                <p className="text-[12px] text-gray-500 leading-[1.6] flex-1 mb-4">
                  {pkg.desc}
                </p>

                {/* Install command */}
                <div className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 flex items-center gap-2">
                  <span className="text-white/20 text-[10px] font-mono shrink-0">$</span>
                  <code className="font-mono text-[10px] text-white/55 flex-1 truncate">
                    {pkg.install}
                  </code>
                  <span className="text-white/20 group-hover:text-emerald-400/60 transition-colors text-[10px]">↗</span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>

        {/* Bottom: core package mention */}
        <Reveal delay={200}>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <span className="font-mono text-[10px] text-white/25 shrink-0">+</span>
            <div className="min-w-0">
              <span className="font-mono text-[12px] text-white/50">@vergex402/core</span>
              <span className="ml-3 text-[11px] text-white/25">shared verifier — CAIP-2 networks, x402 v2 wire, facilitator calls</span>
            </div>
            <a
              href="https://www.npmjs.com/package/@vergex402/core"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              npm ↗
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
