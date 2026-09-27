"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";

const TABS = [
  { id: "express", label: "Express", pkg: "@vergex402/express", badge: null as string | null },
  { id: "ai-sdk", label: "AI SDK", pkg: "@vergex402/ai-sdk", badge: "NEW" as string | null },
  { id: "hono", label: "Hono", pkg: "@vergex402/hono", badge: null as string | null },
  { id: "fetch", label: "Fetch (buyer)", pkg: "@vergex402/fetch", badge: null as string | null },
];

type TabId = typeof TABS[number]["id"];

const CODE: Record<TabId, { file: string; lines: { type: string; text: string }[] }> = {
  express: {
    file: "server.ts",
    lines: [
      { type: "keyword", text: "import" }, { type: "plain", text: " express " }, { type: "keyword", text: "from" }, { type: "string", text: ' "express"' }, { type: "plain", text: ";" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { paywall } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "@vergex402/express"' }, { type: "plain", text: ";" },
      { type: "plain", text: "\n\nconst app = " }, { type: "fn", text: "express" }, { type: "plain", text: "();\n\napp." }, { type: "fn", text: "use" }, { type: "plain", text: '("' }, { type: "string2", text: "/api/premium" }, { type: "plain", text: '", ' }, { type: "fn", text: "paywall" }, { type: "plain", text: "({\n  amount: " }, { type: "num", text: "0.001" }, { type: "comment", text: "          // USDG" },
      { type: "plain", text: "\n  recipient: process.env." }, { type: "const", text: "WALLET" }, { type: "plain", text: ",\n  network: " }, { type: "string", text: '"robinhood-mainnet"' }, { type: "plain", text: ",\n}));" },
    ]
  },
  "ai-sdk": {
    file: "route.ts",
    lines: [
      { type: "comment", text: "// Monetize any AI route — per-call USDG payment" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { createX402Gate } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "@vergex402/ai-sdk"' }, { type: "plain", text: ";" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { streamText } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "ai"' }, { type: "plain", text: ";" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { openai } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "@ai-sdk/openai"' }, { type: "plain", text: ";" },
      { type: "plain", text: "\n\nconst { POST: gate } = " }, { type: "fn", text: "createX402Gate" }, { type: "plain", text: "({\n  amount: " }, { type: "num", text: "0.001" }, { type: "comment", text: "   // USDG per call" },
      { type: "plain", text: '\n  recipient: "' }, { type: "string2", text: "0xYOUR_WALLET" }, { type: "plain", text: '",\n});\n\n' }, { type: "keyword", text: "export async function" }, { type: "plain", text: " " }, { type: "fn", text: "POST" }, { type: "plain", text: "(req: Request) {\n  " }, { type: "comment", text: "// 402 gate — sends PAYMENT-REQUIRED if unpaid" },
      { type: "keyword", text: "\n  const" }, { type: "plain", text: " r = " }, { type: "keyword", text: "await" }, { type: "plain", text: " " }, { type: "fn", text: "gate" }, { type: "plain", text: "(req." }, { type: "fn", text: "clone" }, { type: "plain", text: "());\n  " }, { type: "keyword", text: "if" }, { type: "plain", text: " (r.status === " }, { type: "num", text: "402" }, { type: "plain", text: ") " }, { type: "keyword", text: "return" }, { type: "plain", text: " r;\n  " }, { type: "comment", text: "// paid — run your AI" },
      { type: "keyword", text: "\n  return" }, { type: "plain", text: " " }, { type: "fn", text: "streamText" }, { type: "plain", text: "({ model: " }, { type: "fn", text: "openai" }, { type: "plain", text: '("' }, { type: "string2", text: "gpt-4o-mini" }, { type: "plain", text: '"), ...' }, { type: "fn", text: "await" }, { type: "plain", text: " req." }, { type: "fn", text: "json" }, { type: "plain", text: "() })." }, { type: "fn", text: "toDataStreamResponse" }, { type: "plain", text: "();\n}" },
    ]
  },
  hono: {
    file: "server.ts",
    lines: [
      { type: "keyword", text: "import" }, { type: "plain", text: " { Hono } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "hono"' }, { type: "plain", text: ";" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { paywall } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "@vergex402/hono"' }, { type: "plain", text: ";" },
      { type: "plain", text: "\n\nconst app = " }, { type: "keyword", text: "new" }, { type: "plain", text: " " }, { type: "fn", text: "Hono" }, { type: "plain", text: "();" },
      { type: "plain", text: "\n\napp." }, { type: "fn", text: "use" }, { type: "plain", text: '("' }, { type: "string2", text: "/api/*" }, { type: "plain", text: '", ' }, { type: "fn", text: "paywall" }, { type: "plain", text: "({\n  amount: " }, { type: "num", text: "0.001" }, { type: "comment", text: "      // USDG" },
      { type: "plain", text: "\n  recipient: " }, { type: "string", text: '"0xYOUR_WALLET"' }, { type: "plain", text: ",\n  network: " }, { type: "string", text: '"robinhood-mainnet"' }, { type: "plain", text: ",\n}));\n\napp." }, { type: "fn", text: "get" }, { type: "plain", text: '("' }, { type: "string2", text: "/api/data" }, { type: "plain", text: '", (c) => c.' }, { type: "fn", text: "json" }, { type: "plain", text: "({ data: " }, { type: "string", text: '"unlocked"' }, { type: "plain", text: " }));" },
    ]
  },
  fetch: {
    file: "agent.ts",
    lines: [
      { type: "comment", text: "// Agent-side: pay any x402 endpoint automatically" },
      { type: "keyword", text: "\nimport" }, { type: "plain", text: " { payAndFetch } " }, { type: "keyword", text: "from" }, { type: "string", text: ' "@vergex402/fetch"' }, { type: "plain", text: ";" },
      { type: "plain", text: "\n\nconst res = " }, { type: "keyword", text: "await" }, { type: "plain", text: " " }, { type: "fn", text: "payAndFetch" }, { type: "plain", text: "(" }, { type: "string", text: '"https://vergesnowy.com/x/crypto-price"' }, { type: "plain", text: ", {\n  privateKey: process.env." }, { type: "const", text: "AGENT_KEY" }, { type: "keyword", text: " as" }, { type: "plain", text: " `0x${" }, { type: "keyword", text: "string" }, { type: "plain", text: "}`,\n  maxAmount: " }, { type: "num", text: "0.01" }, { type: "comment", text: "     // USDG ceiling" }, { type: "plain", text: "\n});\n\n" }, { type: "comment", text: "// payAndFetch handles 402 → sign → retry automatically" },
      { type: "keyword", text: "\nconst" }, { type: "plain", text: " data = " }, { type: "keyword", text: "await" }, { type: "plain", text: " res." }, { type: "fn", text: "json" }, { type: "plain", text: "();" },
    ]
  }
};

const COLOR: Record<string, string> = {
  keyword: "text-pink-400",
  string: "text-emerald-400",
  string2: "text-sky-300",
  fn: "text-yellow-300",
  num: "text-amber-400",
  comment: "text-gray-500",
  const: "text-purple-300",
  plain: "text-gray-300",
};

export default function CodeSnippet() {
  const [active, setActive] = useState<TabId>("express");
  const tab = CODE[active];

  return (
    <section className="bg-[#1B2824] py-20 md:py-32 lg:py-40 isolate relative z-20 rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px]">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8">
        <Reveal>
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-5">
              <span className="bg-emerald-500 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block">
                Two lines
              </span>{" "}
              to charge for anything.
            </h2>
            <p className="text-gray-400 text-sm md:text-base max-w-[560px] mx-auto">
              Server middleware, AI SDK gate, or buyer agent — pick the SDK that fits your stack.
            </p>
          </div>
        </Reveal>

        <div className="bg-[#1B1B1C] rounded-[20px] md:rounded-[24px] lg:rounded-[32px] overflow-hidden border border-[#2a2a2e]">
          {/* SDK tab bar */}
          <div className="border-b border-[#2a2a2e] px-4 md:px-6 pt-4 pb-0 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono font-medium transition-all border-b-2 ${
                  active === t.id
                    ? "text-white border-emerald-400 bg-[#131315]"
                    : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]"
                }`}
              >
                {t.pkg}
                {t.badge && (
                  <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-emerald-300">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: value props */}
            <div className="p-5 md:p-8 lg:p-12 border-r border-[#2a2a2e]">
              <Reveal delay={100}>
                {active === "ai-sdk" ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-emerald-300 mb-4">
                      VERCEL AI SDK v7 COMPATIBLE
                    </div>
                    <h3 className="text-xl md:text-3xl lg:text-4xl font-light text-white mb-3">
                      Charge per AI call.<br />
                      <span className="text-emerald-400">Any model. Any route.</span>
                    </h3>
                    <p className="text-gray-400 mb-6 text-sm md:text-base">
                      Gate your AI routes with per-request USDG payment. Works with GPT-4o, Claude, Gemini — anything the AI SDK supports. Server-side or client-side.
                    </p>
                    <div className="space-y-2 mb-6">
                      {["Works with Vercel AI SDK v7 (ai >=4)", "streamText, generateText, generateObject — all gated", "honoX402Gate for Hono AI routes", "Buyer-side: wrapWith402() pays automatically"].map(item => (
                        <div key={item} className="flex items-start gap-2">
                          <span className="text-emerald-400 text-sm shrink-0 mt-0.5">✓</span>
                          <span className="text-gray-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : active === "fetch" ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/[0.07] px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-sky-300 mb-4">
                      AGENT / BUYER SDK
                    </div>
                    <h3 className="text-xl md:text-3xl lg:text-4xl font-light text-white mb-3">
                      Call paid APIs.<br />
                      <span className="text-sky-300">Pay automatically.</span>
                    </h3>
                    <p className="text-gray-400 mb-6 text-sm md:text-base">
                      The buyer-side SDK for agents and scripts that need to consume x402-gated endpoints. Handles the full challenge → sign → retry loop in one call.
                    </p>
                    <div className="space-y-2 mb-6">
                      {["Handles 402 challenge automatically", "Signs with your agent private key", "Retries with payment proof", "Works on Robinhood Chain, Base, Ethereum + more"].map(item => (
                        <div key={item} className="flex items-start gap-2">
                          <span className="text-sky-300 text-sm shrink-0 mt-0.5">✓</span>
                          <span className="text-gray-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl md:text-3xl lg:text-4xl font-light text-white mb-3">
                      Two lines to monetize any endpoint.
                    </h3>
                    <p className="text-gray-400 mb-6 text-sm md:text-base">
                      Drop the middleware in front of any route. Set a price in USDG. Your endpoint now speaks x402.
                    </p>
                    <div className="space-y-2 mb-6">
                      {["Instant USDG settlement (~400ms)", "Nonce-signed, replay-safe", active === "hono" ? "Hono middleware — edge-ready" : "Express middleware — any Node server", "Self-host with BYO Robinhood RPC"].map(item => (
                        <div key={item} className="flex items-start gap-2">
                          <span className="text-emerald-400 text-sm shrink-0 mt-0.5">✓</span>
                          <span className="text-gray-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-3 flex-wrap">
                  <a href="/docs" className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors inline-block">
                    See Docs →
                  </a>
                  <a
                    href={`https://www.npmjs.com/package/${TABS.find(t => t.id === active)?.pkg}`}
                    target="_blank" rel="noopener"
                    className="border border-white/15 text-white/60 px-4 py-2 rounded-lg text-sm font-mono hover:text-white hover:border-white/30 transition-colors inline-block"
                  >
                    npm install ↗
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Right: code */}
            <Reveal delay={150}>
              <div className="p-4 md:p-8 lg:p-12 bg-[#0f1110]">
                <div className="text-gray-500 mb-3 font-mono text-[11px] uppercase tracking-[0.18em]">
                  {tab.file}
                </div>
                <pre className="font-mono text-[11.5px] sm:text-[13px] leading-[1.8] overflow-x-auto">
                  {tab.lines.map((seg, i) => (
                    <span key={i} className={COLOR[seg.type] ?? "text-gray-300"}>
                      {seg.text}
                    </span>
                  ))}
                </pre>
              </div>
            </Reveal>
          </div>

          {/* Bottom install strip */}
          <div className="border-t border-[#2a2a2e] px-5 py-4 md:px-8 flex items-center gap-3 bg-[#131315]">
            <span className="font-mono text-[10px] text-gray-600 uppercase tracking-widest shrink-0">npm</span>
            <code className="font-mono text-[12px] text-emerald-300/80 flex-1">
              npm install {TABS.find(t => t.id === active)?.pkg}
            </code>
            <div className="flex gap-1.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`size-2 rounded-full transition-all ${active === t.id ? "bg-emerald-400" : "bg-white/15 hover:bg-white/30"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
