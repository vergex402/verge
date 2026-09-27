/**
 * @vergex402/ai-sdk — client-side: wrap a Vercel AI SDK model provider
 * so every call first pays an x402 endpoint.
 *
 * Compatible with ai >=4.0 (AI SDK v7+).
 */

import type { X402MiddlewareOptions } from './types.js';

// ── Lazy import of @vergex402/fetch (peer dep) ──────────────────────────────
async function getPayAndFetch() {
  // Dynamic import so tree-shaking works in Node runtimes that don't need it
  const m = await import('@vergex402/fetch');
  return m.payAndFetch;
}

// ── Internal nonce cache — don't pay twice in the same process tick ─────────
const paidNonces = new Set<string>();

/**
 * Wraps a Vercel AI SDK language model so each call first executes an x402
 * payment against `options.endpoint`. The payment is cached per-nonce so a
 * single model call doesn't double-pay.
 *
 * @example
 * ```ts
 * const model = wrapWith402(openai("gpt-4o-mini"), {
 *   endpoint: "https://api.example.com/premium",
 *   privateKey: process.env.AGENT_KEY as `0x${string}`,
 * });
 * const { text } = await generateText({ model, prompt: "..." });
 * ```
 */
export function wrapWith402<T extends object>(model: T, options: X402MiddlewareOptions): T {
  const { endpoint, privateKey, maxAmountUsdg = 0.1 } = options;

  // Proxy every method call to inject the 402 payment before execution
  return new Proxy(model, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig !== 'function') return orig;

      return async function (...args: unknown[]) {
        // Step 1 — probe endpoint, execute payment if challenged
        const payAndFetch = await getPayAndFetch();
        const payRes = await payAndFetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-ai-sdk-probe': '1' },
          body: JSON.stringify({ probe: true }),
          privateKey,
          maxAmount: maxAmountUsdg,
        });

        // Verify gate was cleared
        if (payRes.status !== 200 && payRes.status !== 402) {
          // 402 already handled by payAndFetch; non-200 after payment = upstream error
          const errText = await payRes.text().catch(() => '');
          throw new Error(`x402 gate error ${payRes.status}: ${errText.slice(0, 200)}`);
        }

        // Step 2 — original model call
        return (orig as Function).apply(target, args);
      };
    },
  });
}

/**
 * Standalone: pay an x402 endpoint and return the unlocked response body.
 * Useful when you want to call a paid API directly without wrapping a model.
 *
 * @example
 * ```ts
 * const data = await payAndCall("https://api.example.com/data", {
 *   privateKey: process.env.AGENT_KEY as `0x${string}`,
 * });
 * ```
 */
export async function payAndCall(
  url: string,
  options: { privateKey: `0x${string}`; maxAmountUsdg?: number; body?: unknown },
): Promise<unknown> {
  const payAndFetch = await getPayAndFetch();
  const res = await payAndFetch(url, {
    method: options.body ? 'POST' : 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    privateKey: options.privateKey,
    maxAmount: options.maxAmountUsdg ?? 0.1,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}
