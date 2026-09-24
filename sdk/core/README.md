# @vergex402/core

**x402 v2-compatible** HTTP 402 stablecoin-payment verification. **Robinhood Chain / USDG is the default flagship**, with explicit opt-in rails for Ethereum, Base, Arbitrum, Polygon (USDC), Solana (SPL USDC), and Sui (USDC).

Framework-agnostic — no Express, no Hono, no runtime assumptions. `@vergex402/express` and
`@vergex402/hono` are thin adapters on top of this package so the payment logic (challenge
issuance, on-chain settlement verification, replay protection) has exactly one
implementation instead of being duplicated per framework.

## x402 v2 wire compatibility

Challenges are emitted in **both dialects at once**:

- **x402 v2**: `PAYMENT-REQUIRED` response header (base64 `PaymentRequired` object — CAIP-2 networks, atomic amounts, `exact` scheme, `upfront` payment flow) and `PAYMENT-SIGNATURE` request header (base64 `PaymentPayload` carrying the settlement tx).
- **Verge legacy**: `WWW-Authenticate: x402 ...` + `X-Pay-*` headers, and `X-Pay-Tx`/`X-Pay-Nonce` retries.

Standard x402 v2 agents and Verge-native clients interop with the same endpoint with no configuration.

## Hosted facilitator

`https://vergesnowy.com/api/facilitator` implements the x402 v2 facilitator interface (`/supported`, `/verify`, `/settle`) for all Verge rails, zero protocol fees. The same functions below power it — self-host or delegate.

```ts
import { verifyX402Payment, settleX402Payment, decodePaymentSignature } from "@vergex402/core";

const payload = decodePaymentSignature(req.headers["payment-signature"]);
const check = await verifyX402Payment({}, payload, requirements);   // read-only
const done  = await settleX402Payment({ replayStore, challengeStore }, payload, requirements); // commits
```

## Most people should install a framework adapter instead

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

// tx/nonce may come from PAYMENT-SIGNATURE (x402 v2) or X-Pay-* (legacy)
const outcome = await evaluatePayment(opts, tx, nonce, { url: "https://api.example.com/premium" });

switch (outcome.kind) {
  case "challenge": /* respond 402 with outcome.challenge + outcome.headers (includes PAYMENT-REQUIRED) */ break;
  case "nonce_required": /* respond 402, code NONCE_REQUIRED */ break;
  case "replayed": /* respond 402, code TX_REPLAYED */ break;
  case "invalid": /* respond 402, code TX_INVALID */ break;
  case "error": /* respond 402, code TX_ERROR, outcome.detail */ break;
  case "unlocked": /* call next handler */ break;
}
```

## Exports

- `evaluatePayment(opts, tx, nonce, resource?)` — the full decision: issue a challenge (both dialects) or verify + record a payment.
- `verifyX402Payment(opts, payload, requirements)` — facilitator `/verify` (read-only, x402 v2 §7.1).
- `settleX402Payment(opts, payload, requirements)` — facilitator `/settle` (commits nonce consumption + replay guard, §7.2).
- `buildPaymentRequired` / `decodePaymentRequired` / `encodePaymentRequired` — the `PAYMENT-REQUIRED` header object.
- `decodePaymentSignature` / `extractProof` — accept either client dialect.
- `caip2Of` / `networkFromCaip2` / `CAIP2_BY_NETWORK` — CAIP-2 mapping for every rail.
- `verifyStablecoinTransfer(Detailed)` — lower-level EVM on-chain check (Transfer log, amount, recipient, payer extraction).
- `verifySolanaUsdcTransfer` / `verifySuiUsdcTransfer` — SPL token-balance deltas / Sui GraphQL balance changes.
- `defaultChallengeStore` / `defaultReplayStore` — process-local stores; bring Redis/Postgres for production replicas.
- `PAYMENT_RAILS`, `listRails`, `USDG_MAINNET`, `TRANSFER_TOPIC`, `X402_VERSION`.
- Test: `node test-settle.mjs` (spins a mock JSON-RPC server, runs the real settle path: success, replay block, nonce-reuse block).

MIT © Verge Labs
