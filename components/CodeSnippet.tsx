import Reveal from "@/components/Reveal";

export default function CodeSnippet() {
  return (
    <section className="bg-[#1B2824] py-20 md:py-32 lg:py-48 isolate relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="text-center mb-5 md:mb-8 lg:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5 lg:mb-8">
              <span className="bg-emerald-500 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block">
                One line
              </span>{" "}
              of code
            </h2>
          </div>
        </Reveal>

        <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] lg:rounded-[32px] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: text */}
            <div className="p-4 md:p-8 lg:p-12">
              <Reveal delay={100}>
                <h3 className="text-xl md:text-3xl lg:text-4xl font-light text-white mb-2 md:mb-3 lg:mb-4">
                  Two lines to monetize any endpoint.
                </h3>
                <p className="text-gray-400 mb-4 md:mb-5 lg:mb-8 text-sm md:text-base">
                  Drop the middleware in front of any route. Set a price in USDG. Your endpoint now speaks x402.
                </p>
              </Reveal>
              <Reveal delay={200}>
                <div className="space-y-2 md:space-y-3 lg:space-y-4 mb-4 md:mb-5 lg:mb-8">
                  {["Instant USDG settlement", "Nonce-signed, replay-safe", "Express / Hono / Fastify SDKs", "Self-host with BYO Robinhood RPC"].map((item) => (
                    <div key={item} className="flex items-center gap-2 md:gap-3">
                      <span className="text-emerald-400 text-sm">&#x2713;</span>
                      <span className="text-gray-300 text-sm md:text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={300}>
                <a href="/docs" className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors inline-block">
                  See Docs &rarr;
                </a>
              </Reveal>
            </div>

            {/* Right: code */}
            <Reveal delay={200}>
              <div className="p-4 md:p-8 lg:p-12 bg-[#131315] rounded-[20px] m-2 md:m-4">
                <div className="text-gray-500 mb-3 font-mono text-[11px] uppercase tracking-[0.18em]">
                  server.ts
                </div>
                <pre className="font-mono text-[12px] sm:text-[13.5px] leading-[1.7] text-gray-300 overflow-x-auto">
                  <span className="text-pink-400">import</span> express{" "}
                  <span className="text-pink-400">from</span>{" "}
                  <span className="text-emerald-400">&quot;express&quot;</span>;{"\n"}
                  <span className="text-pink-400">import</span> {"{ paywall }"}{" "}
                  <span className="text-pink-400">from</span>{" "}
                  <span className="text-emerald-400">&quot;@vergex402/express&quot;</span>;{"\n"}
                  {"\n"}
                  <span className="text-pink-400">const</span> app ={" "}
                  <span className="text-emerald-400">express</span>();{"\n"}
                  {"\n"}
                  app.<span className="text-emerald-400">use</span>(
                  <span className="text-emerald-400">&quot;/api/premium&quot;</span>,{" "}
                  <span className="text-emerald-400">paywall</span>({"{"}
                  {"\n"}
                  {"  "}amount: <span className="text-amber-400">0.001</span>,
                  {"            "}
                  <span className="text-gray-500">{"// USDG"}</span>
                  {"\n"}
                  {"  "}recipient: process.env.WALLET,{"\n"}
                  {"  "}network:{" "}
                  <span className="text-emerald-400">&quot;Robinhood-mainnet&quot;</span>,{"\n"}
                  {"}"}));
                </pre>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
