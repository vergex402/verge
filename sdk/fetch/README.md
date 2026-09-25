# @vergex402/fetch

> **x402 v2-compatible fetch wrapper** — handles HTTP 402 Payment Required automatically.  
> Pay with USDG/USDC on [Robinhood Chain](https://robinhoodchain.com) (chain ID 4663) or any EVM chain.

---

## Overview

`@vergex402/fetch` is the buyer-side SDK for the [Verge x402 gateway](https://vergex402.com).  
When an endpoint returns `HTTP 402`, the SDK:

1. Parses the `PAYMENT-REQUIRED` header (base64 JSON challenge)
2. Signs and broadcasts an ERC-20 transfer on the specified EVM chain via [viem](https://viem.sh)
3. Waits for on-chain confirmation
4. Retries the original request with a `PAYMENT-SIGNATURE` header
5. Returns the real response — transparent to your code

No manual signing loops, no wallet UI pop-ups, no gas headaches.

---

## Install

```bash
npm install @vergex402/fetch viem
# or
pnpm add @vergex402/fetch viem
```

---

## Quick Start

```ts
import { payAndFetch, createSignerFromKey } from '@vergex402/fetch';

// Create a signer from a raw private key (Robinhood Chain by default)
const signer = createSignerFromKey(process.env.PRIVATE_KEY as `0x${string}`);

// Call any x402-protected endpoint — payment is handled automatically
const res = await payAndFetch('https://api.vergex402.com/v1/data/prices', { signer });
const data = await res.json();
console.log(data);
```

---

## API Reference

### `payAndFetch(url, opts, requestInit?)`

Makes a fetch request, automatically handles any `HTTP 402` challenge, pays on-chain, and returns the real response.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string \| URL` | Target endpoint URL |
| `opts` | `PayAndFetchOptions` | Signer and options (see below) |
| `requestInit` | `RequestInit?` | Optional native fetch options (headers, method, body, etc.) |

**Returns:** `Promise<Response>` — the final HTTP response after successful payment (or the original non-402 response).

**Throws:** If payment fails, the transaction reverts, or the server keeps returning 402 after `maxRetries`.

---

### `createSignerFromKey(privateKey, chainId?, rpcUrl?)`

Creates a viem `WalletClient` from a raw hex private key.

```ts
import { createSignerFromKey } from '@vergex402/fetch';

// Robinhood Chain (default)
const signer = createSignerFromKey('0xabc123...def');

// Custom chain
const signer2 = createSignerFromKey('0xabc123...def', 1, 'https://eth.llamarpc.com');
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `privateKey` | `` `0x${string}` `` | required | 32-byte hex private key |
| `chainId` | `number` | `4663` | EVM chain ID |
| `rpcUrl` | `string?` | chain default | RPC endpoint override |

---

### `PayAndFetchOptions`

```ts
interface PayAndFetchOptions {
  signer: WalletClient;          // viem wallet client (from createSignerFromKey)
  maxRetries?: number;           // Max payment attempts (default: 2)
  timeout?: number;              // Fetch timeout in ms (default: 30000)
  onChallenge?: (challenge: X402Challenge) => void | Promise<void>;
  onPaid?: (txHash: Hash, challenge: X402Challenge) => void | Promise<void>;
}
```

---

### `X402Challenge`

```ts
interface X402Challenge {
  network: string;       // CAIP-2, e.g. "eip155:4663"
  scheme: string;        // "exact"
  amount: string;        // Atomic units (e.g. "1000000" = 1 USDG)
  recipient: Address;    // Payee wallet address
  asset: Address;        // ERC-20 token contract
  nonce: string;         // Server nonce
  raw: Record<string, unknown>; // Full challenge object
}
```

---

### Constants

```ts
import { ROBINHOOD_CHAIN, USDG_CONTRACT } from '@vergex402/fetch';

// ROBINHOOD_CHAIN: viem Chain object for chain ID 4663
// USDG_CONTRACT:  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
```

---

## Usage Examples

### Basic GET with logging

```ts
import { payAndFetch, createSignerFromKey } from '@vergex402/fetch';

const signer = createSignerFromKey(process.env.PRIVATE_KEY as `0x${string}`);

const res = await payAndFetch(
  'https://api.vergex402.com/v1/premium/analysis',
  {
    signer,
    maxRetries: 3,
    timeout: 60_000,
    onChallenge: (c) => {
      console.log(`💸 Paying ${c.amount} atomic units to ${c.recipient} on ${c.network}`);
    },
    onPaid: (txHash, c) => {
      console.log(`✅ Paid! tx=${txHash}`);
    },
  },
);

if (res.ok) {
  const payload = await res.json();
  console.log(payload);
} else {
  console.error('Request failed:', res.status);
}
```

### POST request with body

```ts
const res = await payAndFetch(
  'https://api.vergex402.com/v1/generate',
  { signer },
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Summarize Robinhood Chain in 3 bullets' }),
  },
);
```

### Custom chain (e.g. Ethereum mainnet)

```ts
import { createSignerFromKey, payAndFetch } from '@vergex402/fetch';

const signer = createSignerFromKey(
  process.env.PRIVATE_KEY as `0x${string}`,
  1,
  'https://eth.llamarpc.com',
);

const res = await payAndFetch('https://api.example.com/premium', { signer });
```

---

## Using with AI Agents

### LangChain Tool

```ts
import { DynamicTool } from '@langchain/core/tools';
import { payAndFetch, createSignerFromKey } from '@vergex402/fetch';

const signer = createSignerFromKey(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

const vergeTool = new DynamicTool({
  name: 'verge_paid_api',
  description: 'Fetch data from the Verge x402 API. Input: the endpoint path (e.g. /v1/prices).',
  func: async (path: string) => {
    const url = `https://api.vergex402.com${path}`;
    const res = await payAndFetch(url, { signer });
    if (!res.ok) return `Error ${res.status}: ${await res.text()}`;
    return JSON.stringify(await res.json());
  },
});

// Use vergeTool in your LangChain agent
```

### OpenAI Function Calling

```ts
import OpenAI from 'openai';
import { payAndFetch, createSignerFromKey } from '@vergex402/fetch';

const openai = new OpenAI();
const signer = createSignerFromKey(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_paid_data',
      description: 'Fetch data from a Verge x402 endpoint, paying automatically with USDG.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full HTTPS URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
];

async function callVergeEndpoint(url: string): Promise<string> {
  const res = await payAndFetch(url, { signer });
  if (!res.ok) return `Error: ${res.status}`;
  return JSON.stringify(await res.json());
}

// In your message loop:
async function runAgent(userMessage: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === 'stop') {
      return choice.message.content;
    }

    if (choice.finish_reason === 'tool_calls') {
      messages.push(choice.message);
      for (const tc of choice.message.tool_calls ?? []) {
        if (tc.function.name === 'fetch_paid_data') {
          const { url } = JSON.parse(tc.function.arguments) as { url: string };
          const result = await callVergeEndpoint(url);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          });
        }
      }
    }
  }
}
```

---

## Protocol Notes

### x402 v2 (PAYMENT-REQUIRED)

The SDK speaks x402 v2 natively:

```
← 402 Payment Required
   PAYMENT-REQUIRED: <base64({ accepts: [{ network, scheme, amount, recipient, asset, nonce }] })>

→ Retry with:
   PAYMENT-SIGNATURE: <base64({ x402Version:2, scheme:"exact", network, payload:{from,to,value,nonce,asset,txHash} })>
```

### Legacy x402 (WWW-Authenticate)

For servers using the older `WWW-Authenticate: x402` header, the SDK falls back to:

```
← 402  WWW-Authenticate: x402
       X-Pay-Nonce: <nonce>
       X-Pay-Amount: <amount>
       X-Pay-Recipient: <address>

→ Retry with:
   X-Pay-Tx: <txHash>
   X-Pay-Nonce: <nonce>
```

---

## Environment Variables

```bash
PRIVATE_KEY=0x...   # 32-byte hex private key for signing payments
```

⚠️ **Never commit private keys.** Use environment variables or a secrets manager.

---

## Development

```bash
git clone https://github.com/vergex402/verge
cd verge/sdk/fetch
npm install
npm run build
```

---

## License

MIT © Verge x402
