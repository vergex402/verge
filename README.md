<div align="center">

<img src="public/banner.jpg?v=2" alt="Verge HTTP 402 for AI agents on Robinhood Chain" width="100%"/>

# verge

**HTTP 402 for AI agents.** Robinhood-native facilitator for x402 micropayments. Settled in 400ms, 0.5% fee.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Robinhood Chain](https://img.shields.io/badge/Robinhood_Chain-mainnet-10b981?style=flat-square)](https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![Verify](https://github.com/vergex402/verge/actions/workflows/verify.yml/badge.svg)](https://github.com/vergex402/verge/actions/workflows/verify.yml)
[![npm express](https://img.shields.io/npm/v/@vergex402/express?label=%40vergex402%2Fexpress&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/express)
[![npm hono](https://img.shields.io/npm/v/@vergex402/hono?label=%40vergex402%2Fhono&style=flat-square&color=10b981)](https://www.npmjs.com/package/@vergex402/hono)
[![Stars](https://img.shields.io/github/stars/vergex402/verge?style=flat-square&logo=github&color=10b981)](https://github.com/vergex402/verge/stargazers)
[![Status](https://img.shields.io/badge/status-LIVE-10b981?style=flat-square)]()
[![$VERGE](https://img.shields.io/badge/$VERGE-Pons-10b981?style=flat-square)](https://ponsralph.xyz)

[Website](https://vergesnowy.com) · [Twitter](https://x.com/vergesnowyx402) · [$VERGE on Pons](https://ponsralph.xyz) · [Docs](./app/docs/page.tsx) · [Operations](./docs/OPERATIONS.md) · [Express SDK](./sdk/express) · [Hono SDK](./sdk/hono) · [x402 Spec](https://www.x402.org)

**CA:** `Cooming soon`

</div>

---

## What is Verge?

A drop-in middleware that lets any HTTP endpoint speak the **HTTP 402 "Payment Required"** protocol — agents pay USDG on Robinhood Chain, your endpoint unlocks, ~400ms end-to-end.

```ts
import { paywall } from "@vergex402/express";

app.use("/api/premium", paywall({
  amount: 0.001,                       // USDG
  recipient: process.env.WALLET,
  network: "robinhood-mainnet",
}));
```

That's the whole integration.

## Supported payment rails

Verge is **Robinhood-native by default** — USDG on Robinhood Chain (`4663`) is the flagship rail.
The core verifier supports explicit opt-in stablecoin rails across EVM, Solana, and Sui:

| Network | Chain | Asset | Identifier |
|---|---|---|---|
| **Robinhood Chain** | EVM `4663` | USDG | `robinhood-mainnet` |
| Ethereum L1 | EVM `1` | USDC | `ethereum-mainnet` |
| Base | EVM `8453` | USDC | `base-mainnet` |
| Arbitrum One | EVM `42161` | USDC | `arbitrum-mainnet` |
| Polygon | EVM `137` | USDC | `polygon-mainnet` |
| Solana | SVM | USDC | `solana-mainnet` |
| Sui | Move | USDC | `sui-mainnet` |

```ts
app.use("/api/premium", paywall({
  amount: 0.001,
  recipient: process.env.WALLET,
  network: "solana-mainnet", // explicit opt-in; default remains Robinhood/USDG
}));
```

Solana settlement is verified from confirmed SPL token-balance deltas; Sui settlement is verified from finalized transaction balance changes via Sui GraphQL RPC (Sui deprecated JSON-RPC in 2026). EVM rails verify from the stablecoin `Transfer` event log.

## Why Robinhood Chain?

| Network         | Block time | Tx fee     | Verdict for $0.001 calls |
|-----------------|------------|------------|--------------------------|
| **Robinhood Chain** | ~400ms | low | ✓ usable |
| Ethereum L1     | 12s        | $0.50–5    | ✗ fee > payment          |
| Base / Arbitrum | ~2s        | $0.05–0.30 | ✗ still loss on micro    |
| Stripe          | 1–3 days   | $0.30 + 2.9% | ✗ minimum $0.50          |

x402 is interesting on every chain. Robinhood Chain gives Verge a fast EVM settlement rail for USDG.

## Repo layout

```
verge/
├── app/                          # Next.js 16 landing + /app + /docs + wallet APIs
├── components/                   # React components (Hero, ScrollCube, Pricing, …)
├── sdk/express/                  # @vergex402/express — npm-publishable middleware
├── sdk/hono/                     # @vergex402/hono — npm-publishable Hono adapter
├── sdk/core/                     # @vergex402/core — shared EVM rail registry + verifier
├── examples/                     # copyable Express + Hono paid-endpoint starters
├── public/                       # banner.jpg + avatar.jpg (design by @hellokent)
├── BRAND_BRIEF.md                # Brand guidelines + visual world
└── README.md
```

## Develop

```bash
npm install
npm run dev   # → http://localhost:3000
```

## SDK

```bash
cd sdk/express
npm install
npm run build
# → dist/index.js + dist/index.d.ts (ready to publish to npm)
```

See [`sdk/express/README.md`](./sdk/express/README.md) for the API surface and Robinhood-compatible RPC verification.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind 4** (CSS-first config)
- **Motion** (Framer) for hero/scroll animations + 3D scroll-linked cube
- **viem** for on-chain EVM transaction verification

## Pricing

| | Fee | Settlement | Min tx |
|---|---|---|---|
| **Verge** facilitator | **0.5%** | ~400ms | $0.001 |
| Stripe | 2.9% + $0.30 | 1–3 days | $0.50 |
| Self-host (`@verge/facilitator`) | 0% | ~400ms | $0.001 |

Self-hosted means **you** run the facilitator on **your** Robinhood Chain RPC — no Verge in the loop, just our open-source code.

## Roadmap

- [x] x402 challenge / replay flow
- [x] On-chain USDG Transfer verification on Robinhood Chain
- [x] Express middleware
- [x] Hono adapter (`@vergex402/hono`)
- [x] Wallet-authenticated developer gateway (Reown)
- [x] Verified endpoint directory + machine-readable `/api/catalog`
- [x] Replay-safe payment SDK with pluggable durable nonce store
- [x] Metered API keys with per-wallet daily quota
- [ ] Fastify adapter (Q4 2026)
- [ ] Self-host facilitator binary (Q4 2026)
- [ ] Recursive ZK proofs for batch settlement (Q1 2027)

## License

MIT © 2026 Verge Labs
