import Reveal from "@/components/Reveal";

const rails = [
  { id: "robinhood-mainnet", name: "Robinhood Chain", asset: "USDG", network: "EVM · 4663", logo: "/logos/robinhood.jpg", featured: true },
  { id: "ethereum-mainnet", name: "Ethereum", asset: "USDC", network: "EVM · 1", logo: "/chains/ethereum.png" },
  { id: "base-mainnet", name: "Base", asset: "USDC", network: "EVM · 8453", logo: "/chains/base.png" },
  { id: "arbitrum-mainnet", name: "Arbitrum One", asset: "USDC", network: "EVM · 42161", logo: "/chains/arbitrum.png" },
  { id: "polygon-mainnet", name: "Polygon", asset: "USDC", network: "EVM · 137", logo: "/chains/polygon.svg" },
  { id: "solana-mainnet", name: "Solana", asset: "USDC", network: "SVM", logo: "/chains/solana.png" },
  { id: "sui-mainnet", name: "Sui", asset: "USDC", network: "Move", logo: "/chains/sui.png" },
];

const ecosystem = [
  { name: "x402", note: "Open payment protocol", logo: "/logos/x402.svg", href: "https://www.x402.org" },
  { name: "Alchemy", note: "RPC infrastructure", logo: "/logos/alchemy.jpg", href: "https://www.alchemy.com" },
  { name: "Circle", note: "USDC", logo: "/logos/circle.jpg", href: "https://www.circle.com" },
  { name: "Uniswap", note: "Onchain liquidity", logo: "/logos/uniswap.png", href: "https://uniswap.org" },
  { name: "Pons", note: "Verge community", logo: "/logos/pons.jpg", href: "https://ponsralph.xyz" },
];

export default function Ecosystem() {
  return (
    <section id="networks" className="relative overflow-hidden bg-[#101211] py-20 md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(52,211,153,.09),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-emerald-200/80"><span className="size-1.5 rounded-full bg-emerald-300"/>MULTICHAIN PAYMENT RAILS</span>
              <h2 className="text-3xl font-light tracking-[-0.04em] text-white md:text-5xl">One gateway.<br/><span className="text-white/45">Seven ways to settle.</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 md:text-base">Choose the network that fits your users. Robinhood Chain settles in USDG; Ethereum, Base, Arbitrum, Polygon, Solana and Sui settle in USDC.</p>
            </div>
            <a href="/api/catalog" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-xs font-medium text-white/70 transition hover:border-emerald-300/30 hover:text-white md:self-auto">Explore the live rail catalog <span aria-hidden>↗</span></a>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rails.map((rail, i) => <Reveal key={rail.id} delay={i * 45}>
            <article className={`group relative h-full overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/25 ${rail.featured ? "border-emerald-300/20 bg-[linear-gradient(145deg,rgba(52,211,153,.10),rgba(255,255,255,.025)_56%)]" : "border-white/[0.075] bg-white/[0.025] hover:bg-white/[0.045]"}`}>
              {rail.featured && <span className="absolute right-3 top-3 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2 py-1 font-mono text-[8px] tracking-[0.13em] text-emerald-200/75">FLAGSHIP</span>}
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#0b0d0c] p-2.5"><img src={rail.logo} alt="" className="size-full object-contain" loading="lazy"/></span>
                <div className="min-w-0"><h3 className="truncate text-sm font-medium text-white/90">{rail.name}</h3><p className="mt-1 font-mono text-[10px] text-white/35">{rail.network}</p></div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="text-[10px] uppercase tracking-[0.12em] text-white/35">Settlement asset</span><span className="rounded-md border border-white/[0.09] bg-black/20 px-2 py-1 font-mono text-[10px] text-white/75">{rail.asset}</span></div>
            </article>
          </Reveal>)}
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200/10 bg-amber-200/[0.035] px-4 py-3.5 text-xs leading-5 text-white/45 md:px-5"><span className="mr-2 font-semibold text-amber-100/75">Dashboard note</span>Merchant wallet balances and activity are currently read from Robinhood Chain. The other six rails are available through the Verge SDK/catalog; wallet analytics are not yet unified across chains.</div>

        <div className="mt-16 border-t border-white/[0.08] pt-8 md:mt-20">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><div className="font-mono text-[10px] tracking-[0.16em] text-white/35">OPEN ECOSYSTEM</div><h3 className="mt-2 text-xl font-light tracking-tight text-white md:text-2xl">Built to work across the stack.</h3></div><p className="max-w-lg text-xs leading-5 text-white/40">Protocol, settlement, RPC and liquidity components — clearly separated from Verge’s own products.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ecosystem.map((item) => <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]">
              <img src={item.logo} alt="" className={`size-9 shrink-0 object-contain ${item.name === "x402" ? "rounded-md" : "rounded-full"}`} loading="lazy"/><span className="min-w-0"><span className="block truncate text-xs font-medium text-white/75 group-hover:text-white">{item.name}</span><span className="mt-1 block truncate text-[10px] text-white/35">{item.note}</span></span>
            </a>)}
          </div>
        </div>

        <Reveal delay={180}>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 md:flex-row md:items-center md:p-6">
            <div><div className="text-base font-medium text-white">Building on Verge?</div><p className="mt-1 text-xs text-white/40">Browse the gateway, inspect the catalog, or start with an SDK.</p></div>
            <div className="flex flex-wrap gap-2"><a href="/app" className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-[#07110c] transition hover:bg-emerald-200">Open developer workspace <span aria-hidden>→</span></a><a href="/docs" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/65 transition hover:border-white/20 hover:text-white">Read the docs</a></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
