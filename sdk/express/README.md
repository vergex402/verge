# @vergex402/express

Express middleware for HTTP 402 USDG micropayments on **Robinhood Chain** (chain ID `4663`).

```bash
npm install @vergex402/express
```

## Quick start

```ts
import express from "express";
import { paywall } from "@vergex402/express";

const app = express();

app.use("/api/premium", paywall({
  amount: 0.001,                       // USDG
  recipient: process.env.WALLET!,
  network: "robinhood-mainnet",
}));

app.get("/api/premium", (req, res) => {
  res.json({ ok: true, message: "unlocked" });
});

app.listen(3000);
```

## How it works

1. First request to a `paywall()`-guarded route returns **HTTP 402 Payment Required** with a signed challenge.
2. The caller pays USDG on Robinhood Chain, including the nonce as a memo.
3. The caller retries with `X-Pay-Tx: <signature>`. The middleware verifies on-chain via the RPC you provide.
4. If valid, the request flows to your handler.

The middleware rejects a missing nonce and rejects a reused transaction hash. The default replay guard is process-local; pass a durable `replayStore` backed by Redis, SQLite, or Postgres when running multiple instances.

## Options

```ts
paywall({
  amount,            // Price in USDG, e.g. 0.001
  recipient,         // Your Robinhood Chain address
  network,           // "robinhood-mainnet"
  rpcUrl,            // Optional custom EVM RPC
  replayStore,       // Optional durable { has(txHash), add(txHash) } replay store
  verify,            // Optional: custom verifier function (req, tx, nonce) → boolean
  realm,             // Optional: realm name in WWW-Authenticate header (default "verge")
});
```

## Self-hosted facilitator

Skip Verge entirely — set `rpcUrl` to your own EVM RPC endpoint. Zero fees.

```ts
paywall({
  amount: 0.001,
  recipient: process.env.WALLET!,
  rpcUrl: "https://my-helius.helius-rpc.com/?api-key=…",
});
```

## License

MIT
