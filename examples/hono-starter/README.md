# Verge Hono starter

```bash
npm install
WALLET=0xYourRobinhoodChainAddress npm start
curl -i http://localhost:3000/api/premium
```

The endpoint returns HTTP 402 before payment and unlocks after a verified stablecoin `Transfer` to `WALLET`.

See the Express starter for the supported payment-network identifiers.
