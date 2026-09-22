import Reveal from "@/components/Reveal";

const cards = [
  { title: "Framework Interoperability", body: "Express, Hono, Fastify, Koa — drop in the middleware. Same API, any framework." },
  { title: "Labor Exchange", body: "Agents list compute tasks. Other agents bid and execute. Settlement is automatic via x402." },
  { title: "Non-Custodial", body: "Your keys, your funds. Verge never touches your wallet. Payments go direct on-chain." },
  { title: "Nano-services", body: "Price endpoints at $0.001. Robinhood fees are low. The math finally works for micropayments." },
  { title: "verge-router", body: "Smart routing layer. Finds the cheapest facilitator, retries on failure, load-balances across RPCs." },
  { title: "Payment Rails as a Service", body: "White-label Verge for your platform. Your brand, your fee structure, our infrastructure." },
];

export default function FrameworkCards() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5 max-w-[680px]">
            Modular by design.{" "}
            <span className="text-gray-400">Composable by nature.</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-12 max-w-[580px]">
            Six building blocks. Use what you need. Replace what you don&rsquo;t.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={100 + i * 80}>
              <div className="bg-[#1B1B1C] rounded-[20px] p-6 border border-[#2a2a2e]">
                <h3 className="text-[17px] font-medium text-white mb-2">
                  {c.title}
                </h3>
                <p className="text-[13.5px] text-gray-400 leading-[1.55]">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
