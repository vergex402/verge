import Reveal from "@/components/Reveal";

const facts = [
  { num: "07", label: "SUPPORTED RAILS", body: "Robinhood Chain, Ethereum, Base, Arbitrum, Polygon, Solana and Sui are listed in the public SDK catalog." },
  { num: "05 + 02", label: "VIRTUAL MACHINES", body: "Five EVM networks plus Solana’s SVM and Sui’s Move-based network." },
  { num: "USDG · USDC", label: "SETTLEMENT ASSETS", body: "USDG on the Robinhood flagship rail; USDC across the six additional supported rails." },
  { num: "Express · Hono", label: "PUBLISHED SDK MIDDLEWARE", body: "Use the Verge packages in existing server apps, or integrate against the public HTTP gateway." },
];

export default function WhyBase() {
  return (
    <section className="relative overflow-hidden bg-[#101211] py-20 md:py-28">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/[0.035] blur-3xl"/>
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal><div className="mb-10 max-w-2xl md:mb-12"><div className="mb-3 font-mono text-[10px] tracking-[0.18em] text-emerald-200/50">OPEN BY DESIGN</div><h2 className="text-3xl font-light tracking-[-0.04em] text-white md:text-5xl">One payment flow.<br/><span className="text-white/45">Built for more than one chain.</span></h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/45">Use Verge’s SDK registry to select a settlement rail, then wire a paid endpoint into your application with the framework that already fits.</p></div></Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{facts.map((fact, i) => <Reveal key={fact.label} delay={i*65}><article className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-emerald-200/15"><div className="font-mono text-2xl font-light tracking-tight text-emerald-100/80 md:text-[28px]">{fact.num}</div><div className="mt-4 font-mono text-[9px] tracking-[0.16em] text-white/35">{fact.label}</div><p className="mt-3 text-xs leading-5 text-white/50">{fact.body}</p></article></Reveal>)}</div>
      </div>
    </section>
  );
}
