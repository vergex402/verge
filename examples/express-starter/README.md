# Verge Express starter

```bash
npm install
WALLET=0xYourRobinhoodChainAddress npm start
curl -i http://localhost:3000/api/premium
```

The first call returns HTTP 402. Pay `0.001` USDG on Robinhood Chain to `WALLET`, then retry with the challenge nonce and your transaction hash.

For multichain use, change `network` in `server.mjs` to one of:

```text
robinhood-mainnet → USDG, chain 4663
base-mainnet      → USDC, chain 8453
arbitrum-mainnet  → USDC, chain 42161
polygon-mainnet   → USDC, chain 137
```
