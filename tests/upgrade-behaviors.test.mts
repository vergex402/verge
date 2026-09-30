import test from "node:test";
import assert from "node:assert/strict";
import { toFeedEvents } from "../app/lib/feed-events.ts";
import { summarizeMerchantAnalytics } from "../app/lib/merchant-analytics.ts";
import { filterMarketplace, safePaymentRequirement } from "../app/lib/marketplace-discovery.ts";
import { redactWebhookDelivery } from "../app/lib/webhook-deliveries.ts";

test("feed links verified settlements only through opaque receipt ids", () => {
  const [event] = toFeedEvents([{ id: 9, public_id: "rcpt_abcdefabcdefabcdefabcdefabcdefab", amount_usdg: 1, payment_network: "robinhood-mainnet", endpoint_name: "prices", payer_address: "0x1234567890abcdef1234567890abcdef12345678", settled_at: "2026-09-30T00:00:00.000Z" }]);
  assert.equal(event.receiptUrl, "/receipt/rcpt_abcdefabcdefabcdefabcdefabcdefab");
  assert.equal(JSON.stringify(event).includes("1234567890abcdef"), false);
});

test("merchant analytics derives actionable endpoint performance from persisted rows", () => {
  const analytics = summarizeMerchantAnalytics([
    { id: "ep_a", name: "Prices", requestsCount: 10, paidCallsCount: 2, settlementVolume: 0.5 },
    { id: "ep_b", name: "News", requestsCount: 0, paidCallsCount: 0, settlementVolume: 0 },
  ]);
  assert.deepEqual(analytics, [{ id: "ep_a", name: "Prices", requests: 10, paidCalls: 2, conversionRate: 20, settlementVolume: 0.5, action: "Improve payment conversion" }, { id: "ep_b", name: "News", requests: 0, paidCalls: 0, conversionRate: 0, settlementVolume: 0, action: "Share your endpoint" }]);
});

test("marketplace filtering and requirement inspection never return owners or arbitrary headers", () => {
  const endpoints = filterMarketplace([{ id: "ep_1", name: "Crypto Prices", description: "Live market data", network: "robinhood-mainnet", asset: "USDG", price: 0.1, hostedTemplate: "crypto-price" }, { id: "ep_2", name: "News", description: "Headlines", network: "base-mainnet", asset: "USDC", price: 1, hostedTemplate: null }], { q: "price", network: "robinhood-mainnet", maxPrice: 0.2 });
  assert.deepEqual(endpoints.map((x) => x.id), ["ep_1"]);
  assert.deepEqual(safePaymentRequirement({ amount: "100000", asset: "USDG", network: "eip155:4663", payTo: "0x1234567890abcdef1234567890abcdef12345678", extra: "discard" }), { amount: "100000", asset: "USDG", network: "eip155:4663", payTo: "0x1234…5678" });
});

test("webhook delivery views redact destination paths and provider errors", () => {
  assert.deepEqual(redactWebhookDelivery({ id: 1, webhook_id: "wh_abc", url: "https://example.com/private/hook?token=nope", status: 502, attempts: 3, error: "upstream timeout: internal host" }), { id: 1, webhookId: "wh_abc", destination: "https://example.com", status: 502, attempts: 3, outcome: "failed" });
});
