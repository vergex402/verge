#!/bin/bash
# Generate a batch proof as the merchant wallet (owner of the settled endpoint).
set -a
MERCHANT_KEY=$(python3 -c "import json;print(json.load(open('/root/.verge_demo_merchant_wallet.json'))['private_key'])")
set +a
SITE=https://vergesnowy.com
UA='Mozilla/5.0 (Verge-Batch/1.0)'

# 1. session
cd /root/verge
CH=$(curl -sS -A "$UA" "$SITE/api/auth/challenge?address=0x8b5a888A0C046916d1741a89583660A0810aa37f")
MSG=$(printf '%s' "$CH" | python3 -c "import json,sys;print(json.load(sys.stdin)['message'])")
node -e "
import('viem/accounts').then(({ privateKeyToAccount }) => {
  const acct = privateKeyToAccount('$MERCHANT_KEY'.startsWith('0x') ? '$MERCHANT_KEY' : '0x$MERCHANT_KEY');
  acct.signMessage({ message: process.argv[1] }).then(sig => console.log(sig));
});
" "$MSG" > /tmp/batch_sig
SIG=$(cat /tmp/batch_sig)
curl -sS -A "$UA" -c /tmp/batch_cookies -X POST "$SITE/api/auth/session" -H 'content-type: application/json' \
  -d "$(python3 -c "import json,sys;print(json.dumps({'address':'0x8b5a888A0C046916d1741a89583660A0810aa37f','message':sys.argv[1],'signature':sys.argv[2]}))" "$MSG" "$SIG")" > /tmp/batch_login
cat /tmp/batch_login | head -c 120; echo

# 2. generate batch
curl -sS -A "$UA" -b /tmp/batch_cookies -X POST "$SITE/api/proofs" -o /tmp/batch_result -w 'generate %{http_code}\n'
cat /tmp/batch_result
