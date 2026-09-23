import Reveal from "@/components/Reveal";

const features = [
  { title: "HTTP 402 payment flow", body: "Use the payment-required response pattern to challenge a request and verify the retry against settlement evidence." },
  { title: "AI-to-AI transactions", body: "Agents autonomously discover, negotiate, and pay for API access without human intervention." },
  { title: "Non-custodial wallets", body: "Agents hold their own keys. Payments are direct on-chain transfers, not IOUs." },
  { title: "Revenue sharing", body: "Facilitator fee is 0.5%. Self-host for 0%. Open source, MIT licensed." },
];

export default function AgentCommerce() {
  return (
    <section className="bg-[#171719] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — text */}
          <div>
            <Reveal>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
                <span className="bg-emerald-500 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block">
                  Agent
                </span>{" "}
                Commerce
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-gray-400 text-sm md:text-base mb-8 max-w-[520px]">
                Agents and applications can charge for API access through an HTTP 402 payment challenge. Use USDG on Robinhood Chain or a supported stablecoin rail through the SDK.
                Wallet authorization is only needed for private portal tools.
              </p>
            </Reveal>
          </div>

          {/* Right — feature cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={150 + i * 100}>
                <div className="bg-[#1B1B1C] rounded-[20px] p-5 border border-[#2a2a2e]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400 text-sm">&#x2713;</span>
                    <h3 className="text-[15px] font-medium text-white">
                      {f.title}
                    </h3>
                  </div>
                  <p className="text-[13px] text-gray-400 leading-[1.55]">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
