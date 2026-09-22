import Reveal from "@/components/Reveal";

const steps = [
  {
    n: "01",
    title: "Agent hits a paid endpoint",
    body: "Your API returns 402. The challenge includes the price, recipient, and a nonce — signed so it can't be forged or replayed.",
    code: "GET /api/run\n→ 402 Payment Required",
  },
  {
    n: "02",
    title: "Pay USDG on Robinhood",
    body: "The agent's wallet signs a transfer with the challenge nonce as memo. 400ms to finality.",
    code: "verge.pay(challenge)\n→ tx 5K4f…3Ax confirmed",
  },
  {
    n: "03",
    title: "Replay the request, get data",
    body: "Agent re-calls the endpoint with the tx signature. Verge verifies on-chain and unlocks.",
    code: "GET /api/run\nX-Pay-Tx: 5K4f…3Ax\n→ 200 OK",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-[#171719] py-20 md:py-32 relative z-20">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="max-w-[680px] mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              One request. One signature.{" "}
              <br className="hidden sm:block" />
              <span className="text-gray-400">Settled on-chain.</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              x402 is HTTP&rsquo;s forgotten status code for &ldquo;pay to continue.&rdquo; We made it usable.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="bg-[#1B1B1C] rounded-[20px] p-6 border border-[#2a2a2e]">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] tracking-[0.22em] uppercase text-gray-500 font-mono">
                    step {s.n}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <h3 className="text-[20px] font-medium text-white mb-3 leading-[1.25]">
                  {s.title}
                </h3>
                <p className="text-gray-400 text-[14.5px] leading-[1.6] mb-6">
                  {s.body}
                </p>
                <pre className="bg-[#131315] rounded-xl text-[12px] py-3 px-4 text-gray-300 font-mono whitespace-pre-wrap border border-[#222226]">
                  {s.code}
                </pre>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
