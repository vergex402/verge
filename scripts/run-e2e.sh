#!/bin/bash
# Reads merchant + agent keys from local env files, runs the E2E x402 flow.
set -a
MERCHANT_KEY=$(python3 -c "import json;print(json.load(open('/root/.verge_demo_merchant_wallet.json'))['private_key'])")
AGENT_KEY=$(python3 -c "import json;d=json.load(open('/root/wallets_robinhood/web3_wallets_5.json'));print([e for e in d if e.get('address','').lower()=='0x82ff17d486261f2d0937429bab85ad993b4f5330'][0]['private_key'])")
set +a
export VERGE_SITE_URL=https://vergesnowy.com
cd /root/verge
exec node scripts/e2e-x402.mjs "$MERCHANT_KEY" "$AGENT_KEY"
