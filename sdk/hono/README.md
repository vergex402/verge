# @vergex402/hono

Hono middleware for HTTP 402 stablecoin micropayments. Defaults to **USDG on Robinhood Chain** (ID `4663`), with explicit Base/Arbitrum/Polygon USDC support through the shared core.

## Install

```bash
npm install @vergex402/hono hono
```

## Usage

```ts
import { Hono } from "hono";
import { paywall } from "@vergex402/hono";

const app = new Hono();

app.use("/api/premium", paywall({
  amount: 0.001,               // USDG
  recipient: process.env.WALLET!,
  network: "robinhood-mainnet",
}));

app.get("/api/premium", (c) => c.json({ message: "unlocked" }));
```

## Flow

1. First request with no `X-Pay-Tx` header returns HTTP `402` with an x402 challenge (nonce, amount, recipient, network).
2. Client pays `amount` USDG to `recipient` on Robinhood Chain, then replays the request with:
   - `X-Pay-Tx: <transaction hash>`
   - `X-Pay-Nonce: <nonce from the challenge>`
3. The middleware reads the transaction receipt from the Robinhood Chain RPC, confirms a `Transfer` event moved at least `amount` USDG to `recipient`, and calls `next()`.
4. Each transaction hash can only unlock a request once (in-memory by default — pass `replayStore` for multi-instance deployments).

## Options

| Option | Type | Description |
|---|---|---|
| `amount` | `number` | Price in USDG |
| `recipient` | `string` | Robinhood Chain address (`0x…`) that receives payment |
| `network` | `"robinhood-mainnet"` | Defaults to `robinhood-mainnet` |
| `rpcUrl` | `string` | Defaults to the public Robinhood Chain RPC |
| `replayStore` | `ReplayStore` | Durable `has`/`add` store for production (Redis, SQLite, Postgres) |
| `realm` | `string` | Realm name in `WWW-Authenticate` |

## Network

- Chain: Robinhood Chain (ID `4663`)
- Token: USDG (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, 6 decimals)
- RPC: `https://rpc.mainnet.chain.robinhood.com`

MIT © Verge Labs
