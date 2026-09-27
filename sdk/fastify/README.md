# @vergex402/fastify

> **Fastify v4 plugin for HTTP 402 micropayments** — gate any route behind on-chain USDG payment with a single hook.  
> Pay with USDG/USDC on [Robinhood Chain](https://robinhoodchain.com) (chain ID 4663) or any EVM chain.

---

## Overview

`@vergex402/fastify` is the server-side SDK for Fastify that integrates the [Verge x402 gateway](https://vergex402.com).  
When a request arrives, the plugin:

1. Checks for a `PAYMENT-SIGNATURE` header (x402 v2) or legacy `X-Pay-Tx`/`X-Pay-Nonce` headers
2. Verifies the on-chain USDG transfer against the configured amount and recipient
3. Returns `HTTP 402` with a signed challenge if no payment is present
4. Calls `next()` and lets the route handler run if payment is valid

Supports both x402 v2 (`PAYMENT-SIGNATURE`) and legacy (`X-Pay-*`) dialects automatically.

---

## Install

```bash
npm install @vergex402/fastify
# or
pnpm add @vergex402/fastify
```

Fastify ≥ 4.0.0 is a peer dependency — install it alongside:

```bash
npm install fastify
```

---

## Quick Start

### Route-scoped hook (recommended)

```ts
import Fastify from "fastify";
import { paywall } from "@vergex402/fastify";

const app = Fastify({ logger: true });

// Protect only /api/premium and its sub-routes
app.register(async (instance) => {
  instance.addHook("onRequest", paywall({
    amount: 0.001,           // USDG amount
    recipient: process.env.WALLET!,
    network: "robinhood-mainnet",
  }));

  instance.get("/api/premium", async (req, reply) => {
    return { data: "🔒 protected content" };
  });
});

await app.listen({ port: 3000 });
```

### App-wide plugin

```ts
import Fastify from "fastify";
import { paywallPlugin } from "@vergex402/fastify";

const app = Fastify();

await app.register(paywallPlugin, {
  amount: 0.001,
  recipient: process.env.WALLET!,
  network: "robinhood-mainnet",
});

app.get("/api/data", async () => ({ ok: true }));
await app.listen({ port: 3000 });
```

---

## API Reference

### `paywall(opts: PaywallOptions): onRequestHook`

Returns a Fastify `onRequest` lifecycle hook. Attach it with `instance.addHook("onRequest", paywall(opts))`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts.amount` | `number` | Required USDG amount (human units, e.g. `0.001`) |
| `opts.recipient` | `string` | Payee wallet address (`0x...`) |
| `opts.network` | `string` | CAIP-2 or shorthand, e.g. `"robinhood-mainnet"` |
| `opts.asset?` | `string` | ERC-20 token contract override (defaults to USDG) |
| `opts.replayStore?` | `ReplayStore` | Custom nonce/replay store |

**Returns:** A Fastify `onRequest` hook `(request, reply, done) => void`.

---

### `paywallPlugin`

A `fastify-plugin`-wrapped version of the paywall. Registers globally (escapes Fastify encapsulation).

```ts
app.register(paywallPlugin, opts);
```

---

### `PaywallOptions`

```ts
interface PaywallOptions {
  amount: number;
  recipient: string;
  network: string;
  asset?: string;
  replayStore?: ReplayStore;
}
```

### `ReplayStore`

```ts
interface ReplayStore {
  has(nonce: string): boolean | Promise<boolean>;
  add(nonce: string): void | Promise<void>;
}
```

---

## HTTP 402 Response Format

When payment is required, the plugin responds with:

```json
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64-encoded challenge>
Content-Type: application/json

{
  "error": "Payment required",
  "code": "PAYMENT_REQUIRED",
  "challenge": { ... }
}
```

The client should decode the `PAYMENT-REQUIRED` header, sign and broadcast the USDG transfer, then retry with a `PAYMENT-SIGNATURE` header. Use [`@vergex402/fetch`](https://www.npmjs.com/package/@vergex402/fetch) on the client to handle this automatically.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `PAYMENT_REQUIRED` | 402 | No payment header present — challenge issued |
| `NONCE_REQUIRED` | 402 | Payment sent without nonce |
| `NONCE_INVALID` | 402 | Nonce unknown or expired |
| `TX_REPLAYED` | 402 | Transaction hash already used |
| `TX_INVALID` | 402 | On-chain verification failed |
| `TX_ERROR` | 402 | Unexpected verification error |

---

## Protocol Notes

### x402 v2 (PAYMENT-SIGNATURE)

```
← 402 Payment Required
   PAYMENT-REQUIRED: <base64({ accepts: [{ network, scheme, amount, recipient, asset, nonce }] })>

→ Retry with:
   PAYMENT-SIGNATURE: <base64({ x402Version:2, scheme:"exact", network, payload:{from,to,value,nonce,asset,txHash} })>
```

### Legacy x402 (X-Pay-*)

```
← 402  WWW-Authenticate: x402
       X-Pay-Nonce: <nonce>

→ Retry with:
   X-Pay-Tx: <txHash>
   X-Pay-Nonce: <nonce>
```

Both dialects are handled automatically — no configuration needed.

---

## Development

```bash
git clone https://github.com/vergex402/verge
cd verge/sdk/fastify
npm install
npm run build
```

---

## Related Packages

| Package | Description |
|---------|-------------|
| [`@vergex402/core`](https://www.npmjs.com/package/@vergex402/core) | Core x402 logic — challenge issuance and on-chain verification |
| [`@vergex402/fetch`](https://www.npmjs.com/package/@vergex402/fetch) | Client-side: auto-pay x402 endpoints with `payAndFetch` |
| [`@vergex402/express`](https://www.npmjs.com/package/@vergex402/express) | Express middleware adapter |
| [`@vergex402/hono`](https://www.npmjs.com/package/@vergex402/hono) | Hono middleware adapter |

---

## License

MIT © Verge x402
