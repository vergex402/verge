import Reveal from "@/components/Reveal";

export default function ContractUpgrades() {
  return (
    <section className="bg-[#1B2824] py-20 md:py-32 relative z-20 overflow-hidden">
      {/* Subtle topographic texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3' seed='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "400px 400px",
        }}
      />

      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              Upgrades Like{" "}
              <span className="bg-emerald-500 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block">
                API Versions
              </span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base max-w-[600px] mx-auto">
              Contract upgrades are as simple as changing an API endpoint. Update your payment
              address, keep everything else the same.
            </p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="grid md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
            {/* Current Version */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-white font-medium text-sm">Current Version (v1.0)</span>
              </div>
              <div className="bg-[#1B1B1C] rounded-[20px] p-5 border border-[#2a2a2e]">
                <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.7] text-gray-300 whitespace-pre-wrap">
                  <span className="text-gray-500">{"// Your existing integration"}</span>{"\n"}
                  <span className="text-emerald-400">paymentMiddleware</span>{"\n"}
                  {"("}{"\n"}
                  {"  "}<span className="text-amber-400">&quot;0xverge&quot;</span>{"\n"}
                  {", {"}{"\n"}
                  {"  "}path: <span className="text-emerald-400">&quot;/api/data&quot;</span>{"\n"}
                  {"  "}price: <span className="text-amber-400">&quot;$0.01&quot;</span>{"\n"}
                  {"}"}{");"}</pre>
              </div>
            </div>

            {/* New Version */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-medium text-sm">New Version (v2.0)</span>
              </div>
              <div className="bg-[#1B1B1C] rounded-[20px] p-5 border border-[#2a2a2e]">
                <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.7] text-gray-300 whitespace-pre-wrap">
                  <span className="text-gray-500">{"// Just change the address"}</span>{"\n"}
                  <span className="text-emerald-400">paymentMiddleware</span>{"\n"}
                  {"("}{"\n"}
                  {"  "}<span className="bg-emerald-500/20 text-emerald-400 px-1 rounded">&quot;0xNewAddress&quot;</span>{"\n"}
                  {", {"}{"\n"}
                  {"  "}path: <span className="text-emerald-400">&quot;/api/data&quot;</span>{"\n"}
                  {"  "}price: <span className="text-amber-400">&quot;$0.01&quot;</span>{"\n"}
                  {"}"}{");"}</pre>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={250}>
          <div className="text-center mt-10">
            <p className="text-gray-400 text-sm max-w-[500px] mx-auto">
              No migration scripts. No downtime. No redeployment.
              Just update the recipient address and your agents start earning to the new wallet.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
