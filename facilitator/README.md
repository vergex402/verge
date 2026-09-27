# @vergex402/facilitator — standalone binary

Minimal HTTP-402 settlement server. Runs anywhere Node 22 runs — **no database, no console, no web app**. Just verify and settle.

## Why

The full Verge app needs Postgres and serves the console. Many merchants only need the settlement piece: *"check this payment really happened, then mark the nonce used."* This is that piece, packaged as a ~40 MB Docker image.

## Run

```bash
# From repo root
cd facilitator
npm install
npm run build && npm start
# → verge-facilitator listening on :3399
```

Docker:

```bash
docker build -f facilitator/Dockerfile -t verge-facilitator .
docker run -p 3399:3399 verge-facilitator
```

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness + counters |
| `/facilitator/supported` | GET | Payment kinds this facilitator accepts |
| `/facilitator/challenge?network=..&recipient=0x..&amount=0.001` | GET | Issue a fresh signed challenge (returns base64 `payment-required` header value) |
| `/facilitator/verify` | POST | Check a payment payload without committing (read-only) |
| `/facilitator/settle` | POST | Verify + consume nonce + mark replay key used |

## Example

```bash
# 1. Issue a challenge
curl "http://localhost:3399/facilitator/challenge?network=robinhood-mainnet&recipient=0xYOUR_WALLET&amount=0.001"

# 2. Agent pays USDG on Robinhood Chain with that nonce

# 3. Agent calls your endpoint with PAYMENT-SIGNATURE header;
#    your server forwards to settle:
curl -X POST http://localhost:3399/facilitator/settle \
  -H "content-type: application/json" \
  -d '{"x402Version":2,"paymentPayload":{...},"paymentRequirements":{...}}'
```

## Storage model

Challenges and replay keys are **in-memory with TTL** (10-minute challenge expiry, 50k entry cap).

This is the right default for:

- Single-node deployments
- Merkle-batched settlement (proofs make historical data independently verifiable)
- Consumers who front the facilitator with their own Redis/Postgres

For multi-instance production, run behind a shared nonce store — the `ChallengeStore` / `ReplayStore` interfaces from `@vergex402/core` are the extension point.

## API shape

Same wire protocol as the hosted facilitator at `vergesnowy.com/api/facilitator` — swap the base URL and everything works identically.
