import Reveal from "@/components/Reveal";

const cards = [
  {
    title: "@vergex402/ai-sdk",
    badge: "NEW",
    body: "Gate any Vercel AI SDK route with per-call USDG payment. wrapWith402() for agents, createX402Gate() for Next.js/Hono servers.",
    color: "border-emerald-300/20 bg-emerald-300/[0.03]",
  },
  {
    title: "Revenue Splits",
    badge: "NEW",
    body: "Distribute incoming USDG to co-founders, affiliates, or a treasury — atomically, per settlement, in basis points. Zero extra contracts.",
    color: "border-emerald-300/20 bg-emerald-300/[0.03]",
  },
  {
    title: "MCP Server",
    badge: null,
    body: "Add vergesnowy.com/api/mcp as an MCP tool server in Claude, Cursor, or ChatGPT. Agents can inspect endpoints, create invoices, check reputation.",
    color: "border-white/[0.07] bg-white/[0.02]",
  },
  {
    title: "Non-Custodial",
    badge: null,
    body: "Your keys, your funds. Verge never touches your wallet. Payments go direct on-chain via USDG transfer — no escrow, no wrapping.",
    color: "border-white/[0.07] bg-white/[0.02]",
  },
  {
    title: "Live Settlement Feed",
    badge: null,
    body: "SSE stream at /api/feed broadcasts every settlement in real time. Build dashboards, bots, or public activity tickers on top of it.",
    color: "border-white/[0.07] bg-white/[0.02]",
  },
  {
    title: "Custom Domains",
    badge: null,
    body: "CNAME your own subdomain to the Verge tunnel. Serve hosted /x/<slug> endpoints at api.yoursite.com — your brand, our infra.",
    color: "border-white/[0.07] bg-white/[0.02]",
  },
];

export default function FrameworkCards() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5 max-w-[680px]">
            Built for the full stack.{" "}
            <span className="text-gray-400">Server, agent, and AI.</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-12 max-w-[580px]">
            Every side of agentic commerce — monetize your endpoints, pay others', split revenue, and let AI agents discover and pay automatically.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={80 + i * 70}>
              <div className={`rounded-[20px] p-6 border h-full ${c.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[16px] font-medium text-white">{c.title}</h3>
                  {c.badge && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 font-mono text-[8px] tracking-widest text-emerald-300 font-semibold">
                      {c.badge}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-400 leading-[1.6]">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
