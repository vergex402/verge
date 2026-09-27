<div align="center">

<img src="public/banner.jpg?v=2" alt="Verge — HTTP 402 payment rails for AI agents" width="100%"/>

# verge

**HTTP 402 payment rails for AI agents and software.**  
Gate any endpoint behind a USDG micropayment. Settled on Robinhood Chain in ~400ms.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Robinhood Chain](https://img.shields.io/badge/Robinhood_Chain-4663-10b981?style=flat-square)](https://vergesnowy.com/api/catalog)
[![x402 v2](https://img.shields.io/badge/x402-v2-10b981?style=flat-square)](https://www.x402.org)
[![npm express](https://img.shields.io/npm/v/@vergex402/express?label=%40vergex402%2Fexpress&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/express)
[![npm hono](https://img.shields.io/npm/v/@vergex402/hono?label=%40vergex402%2Fhono&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/hono)
[![npm fetch](https://img.shields.io/npm/v/@vergex402/fetch?label=%40vergex402%2Ffetch&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/fetch)
[![npm ai-sdk](https://img.shields.io/npm/v/@vergex402/ai-sdk?label=%40vergex402%2Fai-sdk&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/ai-sdk)
[![Verify](https://github.com/vergex402/verge/actions/workflows/verify.yml/badge.svg)](https://github.com/vergex402/verge/actions/workflows/verify.yml)
[![Stars](https://img.shields.io/github/stars/vergex402/verge?style=flat-square&logo=github&color=10b981)](https://github.com/vergex402/verge/stargazers)

[**Website**](https://vergesnowy.com) · [**Console**](https://vergesnowy.com/app) · [**Docs**](https://vergesnowy.com/docs) · [**Changelog**](https://vergesnowy.com/changelog) · [**npm**](https://www.npmjs.com/search?q=%40vergex402) · [**Twitter**](https://x.com/vergesnowy402)

</div>

---

## What is Verge?

Verge is an **HTTP 402 payment gateway** — a full-stack platform that lets any API endpoint charge per request using stablecoins, with no accounts, no subscriptions, and no human in the loop.

```
Client (agent or browser)
    │
    ├─ GET /api/data  ──────────────────────────▶  Your server
    │                                               │
    │  ◀── HTTP 402 PAYMENT-REQUIRED ───────────────┤  (paywall middleware)
    │      {amount, recipient, nonce, network}      │
    │                                               │
    ├─ Pay USDG on Robinhood Chain                  │
    │                                               │
    ├─ GET /api/data  (PAYMENT-SIGNATURE header) ──▶│
    │                                               ├─ verify on-chain ✓
    │  ◀── 200 OK + data ───────────────────────────┘
```

**~400ms** end-to-end · **~$0.0001** gas · **0.5%** facilitator fee · Zero lock-in

---

## SDKs

Five packages — every side of the payment:

| Package | Role | Install |
|---------|------|---------|
| [`@vergex402/express`](./sdk/express) | Server middleware — gate any Express route | `npm i @vergex402/express` |
| [`@vergex402/hono`](./sdk/hono) | Hono adapter — edge-compatible paywall | `npm i @vergex402/hono` |
| [`@vergex402/fetch`](./sdk/fetch) | Buyer SDK — `payAndFetch()` auto-pays 402 challenges | `npm i @vergex402/fetch` |
| [`@vergex402/ai-sdk`](./sdk/ai-sdk) | **Vercel AI SDK v7** middleware — gate or pay AI routes | `npm i @vergex402/ai-sdk` |
| [`@vergex402/core`](./sdk/core) | Shared verifier — CAIP-2, x402 v2 wire, facilitator | `npm i @vergex402/core` |

---

## Quickstart

### Server — monetize an Express endpoint

```ts
import express from "express";
import { paywall } from "@vergex402/express";

const app = express();

app.use("/api/premium", paywall({
  amount: 0.001,                    // USDG per request
  recipient: process.env.WALLET,    // your payout wallet
  network: "robinhood-mainnet",     // default rail
}));

app.get("/api/premium", (req, res) => {
  res.json({ data: "unlocked" });
});
```

### Server — monetize an AI route (Next.js + Vercel AI SDK)

```ts
// app/api/ai/route.ts
import { createX402Gate } from "@vergex402/ai-sdk";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const { POST: gate } = createX402Gate({
  amount: 0.001,                    // USDG per AI call
  recipient: "0xYOUR_WALLET",
});

export async function POST(req: Request) {
  const gateRes = await gate(req.clone());
  if (gateRes.status === 402) return gateRes; // challenge sent

  const { messages } = await req.json();
  return streamText({ model: openai("gpt-4o-mini"), messages })
    .toDataStreamResponse();
}
```

### Agent — pay a gated endpoint automatically

```ts
import { payAndFetch } from "@vergex402/fetch";

// Handles the full 402 → sign → retry loop
const res = await payAndFetch("https://vergesnowy.com/x/crypto-price", {
  privateKey: process.env.AGENT_KEY as `0x${string}`,
  maxAmount: 0.01,       // USDG ceiling — throws if challenge > this
});

const data = await res.json();
```

### Agent — wrap any AI SDK model to pay before calling

```ts
import { wrapWith402 } from "@vergex402/ai-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const model = wrapWith402(openai("gpt-4o-mini"), {
  endpoint: "https://api.yourplatform.com/api/ai",
  privateKey: process.env.AGENT_KEY as `0x${string}`,
  maxAmountUsdg: 0.01,
});

const { text } = await generateText({ model, prompt: "Hello" });
```

---

## Hosted gateway — vergesnowy.com

The live gateway at [vergesnowy.com](https://vergesnowy.com) provides a hosted version of the full stack:

| Feature | Endpoint |
|---------|----------|
| Facilitator (verify + settle) | `POST /api/facilitator/verify` · `/settle` |
| Hosted paid endpoints | `GET /x/<slug>` — pay-per-call, no server needed |
| MCP server for AI agents | `POST /api/mcp` — `tools/list` + `tools/call` |
| Machine-readable catalog | `GET /api/catalog` |
| Agent discovery | `GET /api/discover` |
| Live settlement SSE feed | `GET /api/feed` — real-time events |
| Reputation API | `GET /api/reputation?address=0x...` |
| Revenue splits | `POST /api/splits` — distribute USDG by basis points |

### Developer console (`/app`)

Wallet-authenticated (Reown, Robinhood Chain 4663). Features:

- **Overview** — revenue, paid calls, conversion rate, settlement volume
- **Live demo** — interactive x402 in-browser walkthrough
- **Data feeds** — crypto price, news, whale alerts, momentum signals (60s cache)
- **Marketplace** — publish + browse verified paid endpoints
- **Invoices** — shareable `/pay/<id>` payment links; payable by wallet or agent
- **Agent wallets** — generate EVM keypairs, private key shown once, vault-stored
- **Credential vault** — AES-256-GCM encrypted secrets, wallet-scoped
- **Reputation** — 0–100 score from verified on-chain settlements
- **Revenue splits** — distribute % of incoming USDG to multiple wallets
- **API keys** — scoped credentials with expiry + daily quota
- **Webhooks** — HMAC-signed `payment.settled` and `endpoint.called` callbacks
- **Custom domains** — CNAME your subdomain to the Verge tunnel
- **Sandbox mode** — test x402 without real USDG
- **Workbench** — in-browser terminal: `inspect <url>`, `curl`, live debug

### MCP server

Add Verge as an MCP tool server in Claude Code, Cursor, or any MCP-compatible agent:

```json
{
  "mcpServers": {
    "verge": {
      "url": "https://vergesnowy.com/api/mcp",
      "transport": "http"
    }
  }
}
```

Tools: `inspect_endpoint` · `list_marketplace` · `create_invoice` · `get_reputation`

---

## Payment rails

| Network | Type | Asset | Chain / VM |
|---------|------|-------|------------|
| **Robinhood Chain** ⭐ | EVM | USDG | 4663 |
| Ethereum | EVM | USDC | 1 |
| Base | EVM | USDC | 8453 |
| Arbitrum One | EVM | USDC | 42161 |
| Polygon | EVM | USDC | 137 |
| Solana | SVM | USDC | mainnet-beta |
| Sui | Move | USDC | mainnet |

Live catalog: [`vergesnowy.com/api/catalog`](https://vergesnowy.com/api/catalog)

---

## x402 wire protocol (v2)

Verge speaks **both** x402 dialects simultaneously:

```
# v2 (preferred)
→ Server response:  PAYMENT-REQUIRED: <base64 PaymentRequired>
← Client retry:     PAYMENT-SIGNATURE: <base64 PaymentPayload>

# Legacy
→ Server response:  WWW-Authenticate: x402 ...
← Client retry:     X-Pay-Tx: 0x...   X-Pay-Nonce: ...
```

Public facilitator: `vergesnowy.com/api/facilitator/{supported,verify,settle}`  
Zero protocol fee — facilitator is open to anyone, not just Verge users.

---

## Repo layout

```
verge/
├── app/                   Next.js 16 app
│   ├── api/               Route handlers
│   │   ├── catalog/       GET  — live rail catalog
│   │   ├── discover/      GET  — machine-readable gateway metadata
│   │   ├── facilitator/   POST — x402 v2 verify + settle
│   │   ├── feed/          GET  — SSE live settlement stream
│   │   ├── invoice/       CRUD — shareable payment links
│   │   ├── keys/          CRUD — API key management
│   │   ├── marketplace/   CRUD — verified endpoint directory
│   │   ├── mcp/           POST — MCP-over-HTTP tool server
│   │   ├── reputation/    GET  — on-chain reputation scores
│   │   ├── sandbox/       POST — test mode toggle
│   │   ├── splits/        CRUD — revenue split rules
│   │   ├── vault/         CRUD — AES-256-GCM credential store
│   │   ├── wallets/       CRUD — agent EVM keypairs
│   │   ├── webhooks/      CRUD — HMAC-signed event callbacks
│   │   └── x/[slug]/      GET  — hosted paid endpoints
│   ├── app/               /app console (wallet-gated)
│   ├── docs/              /docs developer manual
│   ├── lib/               db, auth, reputation, vault, wallets
│   └── ...
├── components/            React UI components
├── sdk/
│   ├── core/              @vergex402/core   — shared verifier
│   ├── express/           @vergex402/express — Express middleware
│   ├── hono/              @vergex402/hono    — Hono adapter
│   ├── fetch/             @vergex402/fetch   — buyer payAndFetch()
│   └── ai-sdk/            @vergex402/ai-sdk  — Vercel AI SDK gate
├── examples/
│   ├── express-starter/   copy-paste Express paid endpoint
│   └── hono-starter/      copy-paste Hono paid endpoint
└── docs/                  OPERATIONS.md, self-host guide
```

---

## Self-host

```bash
git clone https://github.com/vergex402/verge
cd verge
cp .env.example .env          # fill DATABASE_URL, ROBINHOOD_RPC_*, VERGE_VAULT_KEY
npm install
npm run build
npm start                      # or: systemctl start verge
```

Minimum env vars:

```env
DATABASE_URL=postgres://...
ROBINHOOD_RPC_URL=https://...
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
VERGE_VAULT_KEY=<32-byte hex>
REOWN_PROJECT_ID=<Reown project>
```

See [`.env.example`](./.env.example) for the full list.

---

## Pricing

| | Fee | Settlement | Min tx |
|---|---|---|---|
| **Verge** hosted facilitator | **0.5%** | ~400ms | $0.001 |
| Self-host (BYO RPC) | **0%** | ~400ms | $0.001 |
| Stripe | 2.9% + $0.30 | 1–3 days | $0.50 |
| Ethereum L1 | gas only | ~12s | limited by gas |

**$VERGE token** steps down the hosted fee: Builder (10k) → 0.35% · Pro (50k) → 0.20% · Partner (250k) → 0%.  
CA: `0xb73b18267d23087e3af1390edfeb8c4308921d59` · [Buy on Pons](https://www.ponsfamily.com/launchpad/0xb73B18267d23087e3aF1390edFeB8c4308921D59)

---

## Roadmap

- [x] x402 v2 + legacy wire dialect, dual-mode simultaneously
- [x] Robinhood Chain USDG settlement (~400ms)
- [x] Express middleware (`@vergex402/express`)
- [x] Hono adapter (`@vergex402/hono`)
- [x] Buyer SDK — `payAndFetch()` (`@vergex402/fetch`)
- [x] **Vercel AI SDK v7 gate** (`@vergex402/ai-sdk`) — `createX402Gate`, `wrapWith402`
- [x] Hosted facilitator (public, zero protocol fee)
- [x] Hosted paid endpoints (`/x/<slug>`) — 7 templates, no server needed
- [x] Wallet-authenticated developer console (`/app`)
- [x] MCP server — Claude, Cursor, ChatGPT tool integration
- [x] Agent wallets — EVM keypair generation, vault-stored
- [x] Credential vault — AES-256-GCM, wallet-scoped
- [x] Reputation system — 0–100 from on-chain settlements
- [x] Revenue splits — distribute USDG by basis points
- [x] Webhooks — HMAC-signed `payment.settled` / `endpoint.called`
- [x] Invoices — shareable `/pay/<id>` payment links
- [x] Custom domains — CNAME to Verge tunnel
- [x] Budget engine — per-call max + daily budget for agent wallets
- [x] Sandbox mode — test without real USDG
- [x] Live settlement SSE feed (`/api/feed`)
- [x] Security hardening — atomic replay guard, SSRF protection, rate limits, CSP
- [ ] Fastify adapter (Q4 2026)
- [ ] Self-host facilitator binary (Q4 2026)
- [ ] Multi-chain analytics unified across 7 rails (Q4 2026)
- [ ] ZK batch settlement proofs (Q1 2027)

---

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind 4** · **Motion** (Framer) animations
- **viem** — EVM on-chain verification
- **Postgres** — challenges, sessions, nonces, settlements, splits
- **Cloudflare Tunnel** — public ingress, no open ports
- **Reown** — wallet auth (Robinhood Chain 4663)

---

## Contributing

PRs welcome. Please open an issue first for anything beyond typos/docs.  
Run `npm run build` before submitting — CI checks the same.

---

## License

MIT © 2026 Verge Labs · [vergesnowy.com](https://vergesnowy.com)
