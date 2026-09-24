import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata = { title: "Verge — Developer Docs" };

const rails = [
  ["robinhood-mainnet", "Robinhood Chain", "4663", "USDG", "Default / flagship rail"],
  ["ethereum-mainnet", "Ethereum", "1", "USDC", "Explicit opt-in EVM rail"],
  ["base-mainnet", "Base", "8453", "USDC", "Explicit opt-in EVM rail"],
  ["arbitrum-mainnet", "Arbitrum One", "42161", "USDC", "Explicit opt-in EVM rail"],
  ["polygon-mainnet", "Polygon", "137", "USDC", "Explicit opt-in EVM rail"],
  ["solana-mainnet", "Solana", "SVM", "USDC", "Explicit opt-in SVM rail"],
  ["sui-mainnet", "Sui", "Move", "USDC", "Explicit opt-in Move rail"],
];

const toc = ["Overview", "Install", "Express", "Hono", "x402 flow", "Client retry", "Security", "Multichain", "Portal", "API keys", "Marketplace", "Reference"];

function Code({ children }: { children: string }) {
  return <pre className="code-block my-4">{children}</pre>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-28 border-t border-line pt-10 mt-10"><h2 className="font-display text-[28px] font-semibold tracking-[-0.03em] ink mb-4">{title}</h2>{children}</section>;
}

export default function Docs() {
  return (
    <main className="bg-paper">
      <NavBar />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-card p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] ink-dim">Verge manual</div>
            <nav className="space-y-1">
              {toc.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="block rounded-lg px-3 py-2 text-sm ink-mid transition hover:bg-elev hover:ink">{item}</a>)}
            </nav>
            <div className="mt-5 rounded-xl border border-line bg-soft p-3 text-xs leading-5 ink-mid">
              Short answer: x402 lets software pay for paid HTTP endpoints. Verge provides the middleware, verifier, app console, marketplace, and wallet/API-key layer.
            </div>
          </div>
        </aside>

        <article className="min-w-0 max-w-[920px]">
          <span className="tag-402 mb-6">docs · complete guide</span>
          <h1 className="font-display text-[44px] font-semibold tracking-[-0.04em] leading-[1.02] ink md:text-[64px]">Build paid APIs for agents, apps, and users.</h1>
          <p className="mt-5 max-w-3xl text-[17px] leading-7 ink-mid md:text-[19px]">
            Verge is an HTTP 402 gateway and SDK. Your server returns a payment challenge, the caller pays on a supported rail, then retries with the transaction proof. Robinhood Chain + USDG is the default; other rails are selected with a single <code>network</code> option.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/app" className="btn btn-primary">Open console →</a>
            <a href="/api/catalog" target="_blank" rel="noopener" className="btn btn-ghost">View API catalog</a>
            <a href="https://github.com/vergex402/verge" target="_blank" rel="noopener" className="btn btn-ghost">GitHub</a>
          </div>

          <Section id="overview" title="Overview">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["What is x402?", "A protocol pattern for HTTP 402 Payment Required: request → challenge → payment → retry → access."],
                ["Who pays?", "Agents, apps, scripts, or humans. The protocol is not agent-only; agents are the strongest use case because they can pay per request automatically."],
                ["What does Verge add?", "Express/Hono middleware, stablecoin verification, replay protection hooks, wallet console, marketplace listings, API keys, receipts, and a machine-readable catalog."],
              ].map(([title, text]) => <div key={title} className="card"><h3 className="mb-2 text-lg font-semibold ink">{title}</h3><p className="text-sm leading-6 ink-mid">{text}</p></div>)}
            </div>
          </Section>

          <Section id="install" title="Install">
            <p className="leading-7 ink-mid">Pick the adapter for your server framework. Both adapters call the same <code>@vergex402/core</code> verifier.</p>
            <Code>{`npm install @vergex402/express
npm install @vergex402/hono hono`}</Code>
            <p className="leading-7 ink-mid">Environment you normally need:</p>
            <Code>{`WALLET=0xYourRecipientWallet
# optional: overrides the public/default RPC for the selected network
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com
# optional: used as primary RPC when configured
ALCHEMY_API_KEY=...`}</Code>
          </Section>

          <Section id="express" title="Express quickstart">
            <Code>{`import express from "express";
import { paywall } from "@vergex402/express";

const app = express();
const recipient = process.env.WALLET;
if (!recipient) throw new Error("WALLET is required");

app.use("/api/premium", paywall({
  amount: 0.001,
  recipient,
  network: "robinhood-mainnet", // default rail: USDG on chain 4663
}));

app.get("/api/premium", (_req, res) => {
  res.json({ ok: true, message: "unlocked" });
});

app.listen(3000);`}</Code>
          </Section>

          <Section id="hono" title="Hono quickstart">
            <Code>{`import { Hono } from "hono";
import { paywall } from "@vergex402/hono";

const app = new Hono();
const recipient = process.env.WALLET;
if (!recipient) throw new Error("WALLET is required");

app.use("/api/premium", paywall({
  amount: 0.001,
  recipient,
  network: "robinhood-mainnet",
}));

app.get("/api/premium", (c) => c.json({ ok: true, message: "unlocked" }));`}</Code>
          </Section>

          <Section id="x402-flow" title="The x402 request flow">
            <ol className="space-y-4 leading-7 ink-mid">
              <li><strong className="ink">1. Caller requests a protected route.</strong> Without proof, Verge returns HTTP 402 with both wire formats: the x402 v2 <code>PAYMENT-REQUIRED</code> header (base64 JSON) and the legacy <code>X-Pay-*</code> headers.</li>
              <li><strong className="ink">2. Caller pays the requested asset.</strong> The challenge includes amount, recipient, network (CAIP-2 in the v2 header), token reference, and nonce.</li>
              <li><strong className="ink">3. Caller retries with proof.</strong> Standard agents send <code>PAYMENT-SIGNATURE</code> (base64 PaymentPayload with the settlement tx); Verge-native callers can send <code>X-Pay-Tx</code> + <code>X-Pay-Nonce</code>.</li>
              <li><strong className="ink">4. Middleware verifies settlement.</strong> EVM rails check stablecoin Transfer logs; Solana and Sui use their own transaction/balance verification paths.</li>
            </ol>
            <Code>{`curl -i http://localhost:3000/api/premium

HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6Mi4uLg==  (base64 of:)
{ "x402Version": 2, "resource": { "url": "..." },
  "accepts": [{ "scheme": "exact", "network": "eip155:4663",
    "amount": "1000", "asset": "0x5fc5...d168", "payTo": "0x...",
    "maxTimeoutSeconds": 600, "extra": { "paymentFlow": "upfront",
    "nonce": "8f3c2d" } }],
  "extensions": { "x-verge": { "info": { "nonce": "8f3c2d" } } } }
WWW-Authenticate: x402 realm="verge", nonce="8f3c2d", amount="0.001", recipient="0x...", network="robinhood-mainnet"
X-Pay-Token: USDG
X-Pay-Network: robinhood-mainnet
X-Pay-Chain-Id: 4663
X-Pay-Amount: 0.001
X-Pay-Recipient: 0x...
X-Pay-Nonce: 8f3c2d`}</Code>
            <Code>{`# Standard x402 v2 agent style:
curl -i http://localhost:3000/api/premium \\
  -H "PAYMENT-SIGNATURE: <base64 of PaymentPayload JSON>
   { x402Version: 2, accepted: { scheme: exact, network: eip155:4663 },
     payload: { tx: 0xYourSettlementTx, nonce: 8f3c2d } }"

# Verge-native style (equivalent):
curl -i http://localhost:3000/api/premium \\
  -H "X-Pay-Tx: 0xYourSettlementTx" \\
  -H "X-Pay-Nonce: 8f3c2d"

HTTP/1.1 200 OK
{ "ok": true, "message": "unlocked" }`}</Code>
          </Section>

          <Section id="facilitator" title="Facilitator API (hosted)">
            <p className="leading-7 ink-mid">Vergesnowy.com runs a public x402 v2 facilitator. Any resource server — including your <code>paywall()</code> middleware — can delegate verification and settlement commitment to it, the same role Coinbase CDP or thirdweb facilitators play, but for Robinhood Chain USDG plus six more rails. Zero protocol fees.</p>
            <Code>{`curl https://vergesnowy.com/api/facilitator/supported

{ "kinds": [ { "x402Version": 2, "scheme": "exact",
    "network": "eip155:4663" }, "..." ],
  "extensions": ["x-verge"] }

# Read-only check (spec 7.1):
curl -X POST https://vergesnowy.com/api/facilitator/verify \\
  -H "content-type: application/json" \\
  -d '{ "x402Version": 2,
        "paymentPayload": { "payload": { "tx": "0x...", "nonce": "..." } },
        "paymentRequirements": { "scheme": "exact", "network": "eip155:4663",
          "amount": "1000", "asset": "0x5fc5...d168", "payTo": "0x..." } }

{ "isValid": true, "payer": "0x..." }

# Commit settlement (spec 7.2) - consumes the nonce, blocks replay:
curl -X POST https://vergesnowy.com/api/facilitator/settle -d "...same body..."`}</Code>
          </Section>

          <Section id="client-retry" title="Client retry helper">
            <p className="leading-7 ink-mid">A caller does not need a Verge account. It only needs to understand the 402 response, pay the requested rail, then retry with the proof headers. The core package now exports helpers for parsing the challenge and building retry headers.</p>
            <Code>{`import { parseX402Authenticate, paymentProofHeaders } from "@vergex402/core";

const first = await fetch("https://api.example.com/premium");
if (first.status === 402) {
  const challenge = parseX402Authenticate(first.headers.get("www-authenticate") || "");
  // Your wallet/payment engine sends challenge.amount to challenge.recipient
  // on challenge.network, then returns the settlement transaction hash.
  const txHash = await payStablecoin(challenge);

  const unlocked = await fetch("https://api.example.com/premium", {
    headers: paymentProofHeaders(txHash, challenge.nonce),
  });
}`}</Code>
          </Section>

          <Section id="security" title="Security model">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Issued nonce required", "A paid retry must present a nonce that the middleware actually issued. Unknown or already-consumed nonces return NONCE_INVALID."],
                ["Replay-safe transaction hashes", "Each tx hash is keyed by network and rejected after the first successful unlock. Use a durable ReplayStore in multi-process production."],
                ["Settlement verification", "EVM rails inspect stablecoin Transfer logs; Solana inspects SPL token-balance deltas; Sui inspects finalized balance changes."],
                ["Stateless option", "The built-in stores are in-memory for simple servers. Bring Redis/Postgres stores when running multiple workers or serverless replicas."],
              ].map(([title, text]) => <div key={title} className="rounded-xl border border-line bg-card p-4"><h3 className="mb-2 font-semibold ink">{title}</h3><p className="text-sm leading-6 ink-mid">{text}</p></div>)}
            </div>
          </Section>

          <Section id="multichain" title="Multichain: one option, not a different command">
            <p className="leading-7 ink-mid">You were right to ask: every chain has its own identifier, token, verifier path, and RPC. In Verge, you do not run a different command for each chain. You set <code>network</code> in the SDK options. If omitted, Verge uses <code>robinhood-mainnet</code>. The 402 response tells the caller which network, token, recipient, amount, and nonce to use.</p>
            <div className="my-5 overflow-x-auto rounded-2xl border border-line bg-card">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] ink-dim"><tr><th className="p-4">Network string</th><th className="p-4">Chain</th><th className="p-4">Chain ID</th><th className="p-4">Asset</th><th className="p-4">Notes</th></tr></thead>
                <tbody>{rails.map(([id, chain, chainId, asset, note]) => <tr key={id} className="border-b border-line/70 last:border-0"><td className="p-4 font-mono text-xs ink">{id}</td><td className="p-4 ink-mid">{chain}</td><td className="p-4 ink-mid">{chainId}</td><td className="p-4 ink-mid">{asset}</td><td className="p-4 ink-mid">{note}</td></tr>)}</tbody>
              </table>
            </div>
            <Code>{`app.use("/api/premium", paywall({
  amount: 0.001,
  recipient,
  network: "base-mainnet", // or ethereum-mainnet, arbitrum-mainnet, polygon-mainnet, solana-mainnet, sui-mainnet
}));`}</Code>
            <p className="leading-7 ink-mid">Current app reality: the public catalog shows all supported rails; private wallet balances and transaction history in the console are Robinhood Chain-focused today.</p>
          </Section>

          <Section id="portal" title="Developer portal / console">
            <p className="leading-7 ink-mid">The console is the user-facing workspace. Visitors can explore payment rails and the marketplace before connecting. Wallet connection is only required for private actions.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {["Overview: wallet balance, endpoint count, paid calls, settlement volume", "Transactions: confirmed incoming stablecoin transfers", "Marketplace: browse and publish paid endpoints", "Receipts: explorer-linked settlement proofs", "API Keys: create/revoke wallet-scoped credentials", "Networks: rail registry, token reference, explorer links, SDK snippets"].map((text) => <div key={text} className="rounded-xl border border-line bg-card p-4 text-sm ink-mid">{text}</div>)}
            </div>
          </Section>

          <Section id="api-keys" title="API keys">
            <p className="leading-7 ink-mid">API keys are for apps that want Verge-managed access without forcing every request to carry a payment transaction. A wallet signs into the console, creates a key, and your server can introspect it.</p>
            <Code>{`curl -X POST https://vergesnowy.com/api/keys/verify \
  -H "content-type: application/json" \
  -d '{"key": "vg_live_..."}'

{ "ok": true, "wallet": "0xabc...", "remaining": 998, "limit": 1000 }`}</Code>
            <p className="leading-7 ink-mid">Introspection reports validity, revocation state, and remaining quota. Unknown, revoked, or exhausted keys return HTTP 401.</p>
          </Section>

          <Section id="marketplace" title="Marketplace and catalog">
            <p className="leading-7 ink-mid">The marketplace is the human UI for paid endpoints. <code>/api/catalog</code> is the machine-readable version for agents and crawlers. Use it to discover endpoints, supported rails, docs URL, gateway URL, and demo routes.</p>
            <Code>{`curl https://vergesnowy.com/api/catalog
curl https://vergesnowy.com/api/marketplace
curl https://vergesnowy.com/api/demo`}</Code>
          </Section>

          <Section id="reference" title="Reference">
            <ul className="grid gap-3 md:grid-cols-2">
              {[
                ["Express SDK", "https://www.npmjs.com/package/@vergex402/express"],
                ["Hono SDK", "https://www.npmjs.com/package/@vergex402/hono"],
                ["Source", "https://github.com/vergex402/verge"],
                ["$VERGE contract · Robinhood Chain", "https://robinhoodchain.blockscout.com/token/0xb73b18267d23087e3af1390edfeb8c4308921d59"],
                ["x402 spec", "https://www.x402.org"],
                ["Live catalog", "/api/catalog"],
                ["Console", "/app"],
              ].map(([label, href]) => <li key={label}><a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="block rounded-xl border border-line bg-card p-4 ink-mid transition hover:border-line-bright hover:ink">{label} →</a></li>)}
            </ul>
          </Section>
        </article>
      </div>
      <Footer />
    </main>
  );
}
