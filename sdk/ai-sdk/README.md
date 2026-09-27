# @vergex402/ai-sdk

x402 payment middleware for **Vercel AI SDK v7** (ai >=4.0).

Gate any model call behind a USDG micropayment on Robinhood Chain — or monetize your own AI routes with per-request 402 paywalls.

## Install

```bash
npm install @vergex402/ai-sdk @vergex402/fetch
```

## Client: pay to call a gated model endpoint

```ts
import { openai } from "@ai-sdk/openai";
import { wrapWith402 } from "@vergex402/ai-sdk";
import { generateText } from "ai";

const model = wrapWith402(openai("gpt-4o-mini"), {
  endpoint: "https://your-api.com/api/ai",
  privateKey: process.env.AGENT_KEY as `0x${string}`,
  maxAmountUsdg: 0.01, // safety guard
});

const { text } = await generateText({ model, prompt: "What is x402?" });
console.log(text);
```

## Server: monetize your AI route (Next.js)

```ts
// app/api/ai/route.ts
import { createX402Gate } from "@vergex402/ai-sdk";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const { POST: gateCheck } = createX402Gate({
  amount: 0.001, // 0.001 USDG per call
  recipient: "0xYOUR_WALLET",
});

export async function POST(req: Request) {
  // 1. Gate — returns 402 challenge if unpaid
  const gateRes = await gateCheck(req.clone());
  if (gateRes.status === 402) return gateRes;

  // 2. Paid — run your AI logic
  const { messages } = await req.json();
  const result = streamText({ model: openai("gpt-4o-mini"), messages });
  return result.toDataStreamResponse();
}
```

## Server: monetize your AI route (Hono)

```ts
import { Hono } from "hono";
import { honoX402Gate } from "@vergex402/ai-sdk";

const app = new Hono();
app.use("/api/ai/*", honoX402Gate({ amount: 0.001, recipient: "0xYOUR_WALLET" }));
app.post("/api/ai/chat", async (c) => {
  // only reaches here if payment verified
  return c.json({ text: "Hello paid caller!" });
});
```

## Production stores

The default replay and challenge stores are in-memory and **only safe for development or a single worker**. For multi-worker production, pass durable `ChallengeStore` and `ReplayStore` implementations compatible with `@vergex402/core`. When the supplied replay store implements `AtomicReplayStore`, the gate uses its atomic `claim()` operation to prevent concurrent replay races.

```ts
createX402Gate({ amount: 0.001, recipient: "0xYOUR_WALLET", challengeStore, replayStore });
```

## Protocol

- Uses **x402 v2** wire format (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` headers)
- Settlement verified via the [Verge hosted facilitator](https://vergesnowy.com/api/facilitator)
- Network: **Robinhood Chain 4663**, asset: **USDG**
- Zero protocol fee beyond on-chain gas (~$0.0001)

## Links

- [Verge gateway](https://vergesnowy.com) · [Docs](https://vergesnowy.com/docs) · [GitHub](https://github.com/vergex402/verge)
- [x402 spec](https://www.x402.org) · [npm @vergex402/fetch](https://www.npmjs.com/package/@vergex402/fetch)
