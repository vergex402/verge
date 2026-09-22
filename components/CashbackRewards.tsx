import Reveal from "@/components/Reveal";

export default function CashbackRewards() {
  return (
    <section className="bg-[#1B2824] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — text */}
          <div>
            <Reveal>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
                Built-in, per-transaction{" "}
                <span className="bg-emerald-500 text-black px-1.5 md:px-2 py-0.5 rounded font-semibold inline-block">
                  cashback
                </span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <h3 className="text-xl md:text-2xl font-light text-white mt-8 mb-6">
                Every Transaction Earns
              </h3>
            </Reveal>
            <Reveal delay={150}>
              <div className="space-y-4">
                {[
                  { title: "Automatic rewards", body: "Every settled x402 payment earns cashback. No staking, no claims — it's built into the protocol." },
                  { title: "Decaying rate", body: "Early adopters earn more. Cashback rate decreases as total volume grows — get in early." },
                  { title: "USDG payouts", body: "Rewards are paid in USDG directly to your wallet. No token swaps, no lockups." },
                ].map((item) => (
                  <div key={item.title} className="bg-[#1B1B1C] rounded-[20px] p-5 border border-[#2a2a2e]">
                    <h4 className="text-[15px] font-medium text-white mb-1">{item.title}</h4>
                    <p className="text-[13px] text-gray-400 leading-[1.55]">{item.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right — decay graph */}
          <Reveal delay={200}>
            <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-[#2a2a2e]">
              <h4 className="text-sm font-medium text-gray-400 mb-6">Cashback Rate Decay</h4>
              {/* SVG graph */}
              <div className="relative w-full aspect-[4/3]">
                <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`h-${i}`} x1="50" y1={50 + i * 50} x2="380" y2={50 + i * 50} stroke="#2a2a2e" strokeWidth="1" />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <line key={`v-${i}`} x1={50 + i * 66} y1="50" x2={50 + i * 66} y2="250" stroke="#2a2a2e" strokeWidth="1" />
                  ))}

                  {/* Y-axis labels */}
                  <text x="40" y="55" textAnchor="end" fill="#6b7280" fontSize="10">2.0%</text>
                  <text x="40" y="105" textAnchor="end" fill="#6b7280" fontSize="10">1.5%</text>
                  <text x="40" y="155" textAnchor="end" fill="#6b7280" fontSize="10">1.0%</text>
                  <text x="40" y="205" textAnchor="end" fill="#6b7280" fontSize="10">0.5%</text>
                  <text x="40" y="255" textAnchor="end" fill="#6b7280" fontSize="10">0%</text>

                  {/* X-axis labels */}
                  <text x="50" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">0</text>
                  <text x="116" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">50M</text>
                  <text x="182" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">100M</text>
                  <text x="248" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">150M</text>
                  <text x="314" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">200M</text>
                  <text x="380" y="275" textAnchor="middle" fill="#6b7280" fontSize="10">250M</text>

                  {/* Decay curve */}
                  <path
                    d="M50,50 C100,55 130,80 170,120 C210,160 250,200 320,230 C350,240 370,245 380,248"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    fill="none"
                  />

                  {/* Fill under curve */}
                  <path
                    d="M50,50 C100,55 130,80 170,120 C210,160 250,200 320,230 C350,240 370,245 380,248 L380,250 L50,250 Z"
                    fill="url(#cashbackGrad)"
                    opacity="0.3"
                  />

                  <defs>
                    <linearGradient id="cashbackGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Current position dot */}
                  <circle cx="116" cy="85" r="5" fill="#34d399" />
                  <text x="126" y="80" fill="#34d399" fontSize="11" fontWeight="600">You are here</text>
                </svg>

                <div className="absolute bottom-0 left-0 right-0 text-center">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Total settled requests</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
