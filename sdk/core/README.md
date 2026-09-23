# @vergex402/core

Shared HTTP 402 stablecoin-payment verification for EVM rails. **Robinhood Chain / USDG is the default flagship**, with explicit opt-in support for Base, Arbitrum, and Polygon USDC.

Framework-agnostic — no Express, no Hono, no runtime assumptions. `@vergex402/express` and
`@vergex402/hono` are thin adapters on top of this package so the payment logic (challenge
issuance, on-chain USDG `Transfer` verification, replay protection) has exactly one
implementation instead of being duplicated per framework.

Most people should install a framework adapter instead:

```bash
npm install @vergex402/express
# or
npm install @vergex402/hono hono
```

Use `@vergex402/core` directly only if you're writing your own adapter (Fastify, a queue
worker, a Cloudflare Worker with a custom router, etc.):

```ts
import { evaluatePayment, type PaywallOptions } from "@vergex402/core";

const opts: PaywallOptions = {
  amount: 0.001,
  recipient: process.env.WALLET!,
  network: "robinhood-mainnet",
};

const outcome = await evaluatePayment(opts, req.headers["x-pay-tx"], req.headers["x-pay-nonce"]);

switch (outcome.kind) {
  case "challenge": /* respond 402 with outcome.challenge + outcome.headers */ break;
  case "nonce_required": /* respond 402, code NONCE_REQUIRED */ break;
  case "replayed": /* respond 402, code TX_REPLAYED */ break;
  case "invalid": /* respond 402, code TX_INVALID */ break;
  case "error": /* respond 402, code TX_ERROR, outcome.detail */ break;
  case "unlocked": /* call next handler */ break;
}
```

## Exports

- `evaluatePayment(opts, tx, nonce)` — the full decision: issue a challenge or verify + record a payment.
- `verifyUsdgTransfer({ client, tx, recipient, amount, usdgAddress })` — lower-level on-chain check.
- `robinhoodChain` — a viem `Chain` definition for Robinhood Chain (id `4663`).
- `USDG_MAINNET`, `TRANSFER_TOPIC` — constants.
- `ReplayStore` — interface for a durable `has`/`add` replay guard (Redis, SQLite, Postgres).

MIT © Verge Labs
