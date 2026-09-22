"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";

const tabs = [
  {
    id: "api",
    label: "APIs",
    title: "Monetize any API endpoint",
    body: "Add paywall() middleware to any Express/Hono/Fastify route. Agents pay USDG per call. You earn instantly.",
    code: `app.use("/api/data", paywall({
  amount: 0.005,         // $0.005 USDG per call
  recipient: WALLET,
  network: "Robinhood-mainnet",
}));`,
  },
  {
    id: "web",
    label: "Websites",
    title: "Paywall premium content",
    body: "Serve paywalled HTML pages. Agent or browser pays $0.01 to read. No subscriptions, no accounts.",
    code: `app.get("/article/:id", paywall({
  amount: 0.01,          // $0.01 per page view
  recipient: WALLET,
}), (req, res) => {
  res.send(article.html);
});`,
  },
  {
    id: "data",
    label: "Datasets",
    title: "Sell data per-row or per-query",
    body: "Charge agents per dataset query. Price by complexity. No API key management, no rate limits.",
    code: `app.post("/query", paywall({
  amount: 0.05,          // $0.05 per query
  recipient: WALLET,
}), (req, res) => {
  const rows = db.query(req.body.sql);
  res.json({ rows });
});`,
  },
  {
    id: "mcp",
    label: "MCP Servers",
    title: "Monetize MCP tool calls",
    body: "Claude, GPT, and other AI assistants use MCP to call tools. Add x402 to your MCP server and charge per tool invocation.",
    code: `server.tool("analyze", paywall({
  amount: 0.10,          // $0.10 per analysis
  recipient: WALLET,
}), async (params) => {
  return runAnalysis(params);
});`,
  },
];

export default function DataMonetization() {
  const [active, setActive] = useState("api");
  const tab = tabs.find((t) => t.id === active)!;

  return (
    <section className="bg-[#1B2824] py-20 md:py-32 relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5 max-w-[700px]">
            Secure &amp; Monetize{" "}
            <span className="bg-emerald-500 text-black px-1.5 md:px-2 py-0.5 rounded font-semibold inline-block">
              Data
            </span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-10 max-w-[580px]">
            APIs, websites, datasets, MCP servers. If it returns a response, it can charge for it.
          </p>
        </Reveal>

        {/* Tab selector */}
        <Reveal delay={100}>
          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`text-[12px] tracking-[0.12em] uppercase px-4 py-2 rounded-xl border transition-all ${
                  active === t.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2a2a2e] bg-[#1B1B1C] text-gray-400 hover:border-[#3a3a3e]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Content panel */}
        <Reveal delay={150}>
          <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="p-6 md:p-8 lg:p-12">
                <h3 className="text-xl md:text-2xl font-medium text-white mb-3">
                  {tab.title}
                </h3>
                <p className="text-gray-400 text-[15px] leading-[1.6] mb-6">{tab.body}</p>
                <div className="space-y-2">
                  {["Zero vendor lock-in", "Works with any HTTP client", "Open source SDK", "Self-hostable"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-emerald-400 text-sm">&#x2713;</span>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 md:p-6 lg:p-8">
                <div className="bg-[#131315] rounded-[20px] p-5 border border-[#222226] h-full">
                  <div className="text-gray-500 mb-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                    {tab.id === "mcp" ? "mcp-server.ts" : "server.ts"}
                  </div>
                  <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.7] text-gray-300 whitespace-pre-wrap">{tab.code}</pre>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
