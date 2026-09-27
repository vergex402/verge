/**
 * @vergex402/ai-sdk
 *
 * Vercel AI SDK v7 (ai >=4.0) x402 middleware.
 *
 * Usage — wrap any model provider to require USDG payment before each call:
 *
 * ```ts
 * import { openai } from "@ai-sdk/openai";
 * import { wrapWith402, x402Middleware } from "@vergex402/ai-sdk";
 * import { generateText } from "ai";
 *
 * const model = wrapWith402(openai("gpt-4o"), {
 *   endpoint: "https://your-api.com/pay-per-call",
 *   privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
 * });
 *
 * const { text } = await generateText({ model, prompt: "Hello world" });
 * ```
 *
 * Or use as an AI SDK middleware for pay-per-request server routes:
 *
 * ```ts
 * // app/api/ai/route.ts (Next.js)
 * import { createX402Gate } from "@vergex402/ai-sdk/server";
 * export const POST = createX402Gate({ amount: 0.001, recipient: "0x..." });
 * ```
 */

export * from './client.js';
export * from './server.js';
export * from './types.js';
