import test from "node:test";
import assert from "node:assert/strict";
import { toFeedEvents } from "../app/lib/feed-events.ts";

test("maps persisted settlements into privacy-safe feed events", () => {
  const events = toFeedEvents([{
    id: 42,
    amount_usdg: 0.125,
    payment_network: "robinhood-mainnet",
    endpoint_name: "market-data",
    payer_address: "0x1234567890abcdef1234567890abcdef12345678",
    settled_at: "2026-09-30T16:00:00.000Z",
  }]);

  assert.deepEqual(events, [{
    id: "42",
    receiptUrl: null,
    amountUsdg: 0.125,
    network: "robinhood-mainnet",
    endpointName: "market-data",
    truncatedPayer: "0x1234…5678",
    settledAt: "2026-09-30T16:00:00.000Z",
  }]);
});

test("keeps missing optional settlement fields private and safe", () => {
  const [event] = toFeedEvents([{
    id: 7,
    amount_usdg: 1,
    payment_network: null,
    endpoint_name: null,
    payer_address: null,
    settled_at: "2026-09-30T16:00:00.000Z",
  }]);

  assert.equal(event.network, "robinhood-mainnet");
  assert.equal(event.truncatedPayer, null);
  assert.equal(event.endpointName, null);
});
