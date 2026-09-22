import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata = { title: "Verge — Docs" };

export default function Docs() {
  return (
    <main className="bg-paper">
      <NavBar />

      <article className="max-w-[760px] mx-auto px-6 py-20">
        <span className="tag-402 mb-6">docs · quickstart</span>
        <h1 className="font-display text-[44px] font-semibold tracking-[-0.03em] leading-[1.05] ink mb-4">
          Verge in 60 seconds.
        </h1>
        <p className="ink-mid text-[17px] leading-[1.55] mb-6">
          Monetize any HTTP endpoint with USDG on Robinhood. Wallet-authenticated, no email or password.
        </p>
        <div className="flex flex-wrap gap-2 mb-12">
          <a href="https://www.npmjs.com/package/@vergex402/express" target="_blank" rel="noopener"><img src="https://img.shields.io/npm/v/@vergex402/express?label=%40vergex402%2Fexpress&color=10b981" alt="@vergex402/express on npm" /></a>
          <a href="https://www.npmjs.com/package/@vergex402/hono" target="_blank" rel="noopener"><img src="https://img.shields.io/npm/v/@vergex402/hono?label=%40vergex402%2Fhono&color=10b981" alt="@vergex402/hono on npm" /></a>
          <a href="https://github.com/vergex402/verge" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/GitHub-vergex402%2Fverge-black?logo=github" alt="GitHub repository" /></a>
        </div>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          1. Install
        </h2>
        <p className="ink-mid mb-3 leading-[1.55] text-[15px]">Pick the adapter for your framework — both verify the same USDG payments on Robinhood Chain.</p>
        <pre className="code-block">npm install @vergex402/express</pre>
        <pre className="code-block">npm install @vergex402/hono hono</pre>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          2. Drop in the middleware
        </h2>
        <pre className="code-block">{`import express from "express";
import { paywall } from "@vergex402/express";

const app = express();

app.use("/api/premium", paywall({
  amount: 0.001,                   // USDG
  recipient: process.env.WALLET,
  network: "robinhood-mainnet",
}));

app.get("/api/premium", (req, res) => {
  res.json({ ok: true, message: "unlocked" });
});

app.listen(3000);`}</pre>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          Using Hono instead?
        </h2>
        <pre className="code-block">{`import { Hono } from "hono";
import { paywall } from "@vergex402/hono";

const app = new Hono();

app.use("/api/premium", paywall({
  amount: 0.001,
  recipient: process.env.WALLET,
  network: "robinhood-mainnet",
}));

app.get("/api/premium", (c) => c.json({ ok: true, message: "unlocked" }));`}</pre>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          3. Test the 402 flow
        </h2>
        <p className="ink-mid mb-4 leading-[1.55]">
          Without payment, your endpoint will challenge:
        </p>
        <pre className="code-block">{`curl -i http://localhost:3000/api/premium

HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 realm="verge", nonce="8f3c2d", amount="0.001", …
X-Pay-Recipient: 7Aa3…q9Px
X-Pay-Amount: 0.001
X-Pay-Nonce: 8f3c2d

{
  "error": "Payment required",
  "challenge": { … }
}`}</pre>

        <p className="ink-mid mt-6 mb-4 leading-[1.55]">
          The agent pays USDG with the nonce as memo, then retries:
        </p>
        <pre className="code-block">{`curl -i http://localhost:3000/api/premium \\
  -H "X-Pay-Tx: 5K4f…3Ax" \\
  -H "X-Pay-Nonce: 8f3c2d"

HTTP/1.1 200 OK
{ "ok": true, "message": "unlocked" }`}</pre>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          Self-hosted (0% fees)
        </h2>
        <p className="ink-mid mb-4 leading-[1.55]">
          Provide your own Robinhood RPC and verify locally:
        </p>
        <pre className="code-block">{`paywall({
  amount: 0.001,
  recipient: process.env.WALLET,
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
});`}</pre>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          Gate your own endpoint with a Verge API key
        </h2>
        <p className="ink-mid mb-4 leading-[1.55]">
          Wallet holders can generate a metered API key from the{" "}
          <a href="/app" className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]">gateway</a>.
          Any server — yours included — can verify one of these keys server-side before granting access,
          without touching USDG or the SDK at all:
        </p>
        <pre className="code-block">{`curl -X POST https://vergesnowy.dev/api/keys/verify \\
  -H "content-type: application/json" \\
  -d '{"key": "vg_live_..."}'

{ "ok": true, "wallet": "0xabc...", "remaining": 998, "limit": 1000 }`}</pre>
        <p className="ink-mid mt-4 leading-[1.55]">
          Introspection is free and does not consume the caller&apos;s quota — it only reports whether the key
          is valid, revoked, or exhausted for the day. Revoked or unknown keys respond with HTTP 401.
        </p>

        <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] ink mt-12 mb-4">
          Reference
        </h2>
        <ul className="space-y-2 ink-mid">
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="https://www.npmjs.com/package/@vergex402/express"
              target="_blank"
              rel="noopener"
            >
              npmjs.com/package/@vergex402/express
            </a>{" "}
            — Express middleware
          </li>
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="https://www.npmjs.com/package/@vergex402/hono"
              target="_blank"
              rel="noopener"
            >
              npmjs.com/package/@vergex402/hono
            </a>{" "}
            — Hono middleware
          </li>
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="https://github.com/vergex402/verge"
              target="_blank"
              rel="noopener"
            >
              github.com/vergex402/verge
            </a>{" "}
            — full source, SDKs, and app
          </li>
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="https://vergesnowy.dev/api/catalog"
              target="_blank"
              rel="noopener"
            >
              /api/catalog
            </a>{" "}
            — machine-readable gateway discovery for agents
          </li>
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="https://www.x402.org"
              target="_blank"
              rel="noopener"
            >
              x402.org
            </a>{" "}
            — protocol spec
          </li>
          <li>
            <a
              className="ink underline decoration-[var(--color-line)] hover:decoration-[var(--color-ink)]"
              href="/api/demo"
            >
              /api/demo
            </a>{" "}
            — public demo merchant (try the flow live)
          </li>
        </ul>

        <div className="mt-16 p-6 rounded-[14px] border border-line bg-soft">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] ink-dim mb-2">
            ▸ wallet access
          </div>
          <p className="ink leading-[1.55] mb-4">
            Connect an EVM wallet on Robinhood Chain to open the Developer Portal and manage
            your USDG payment infrastructure.
          </p>
          <a href="/app" className="btn btn-primary !text-[13px]">
            Open Developer Portal →
          </a>
        </div>
      </article>

      <Footer />
    </main>
  );
}
