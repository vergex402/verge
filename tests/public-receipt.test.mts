import test from "node:test";
import assert from "node:assert/strict";
import { toPublicReceipt } from "../app/lib/public-receipt.ts";

test("creates a public receipt without full wallet addresses", () => {
  const receipt = toPublicReceipt({
    public_id: "rcpt_abc",
    amount_usdg: 0.25,
    network: "robinhood-mainnet",
    asset: "USDG",
    resource_name: "market-data",
    payer_address: "0x1234567890abcdef1234567890abcdef12345678",
    wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    tx_hash: "0xaaaabbbbccccddddeeeeffff0000111122223333333344445555666677778888",
    settled_at: "2026-09-30T18:00:00.000Z",
  });
  assert.equal(receipt.id, "rcpt_abc");
  assert.equal(receipt.payer, "0x1234…5678");
  assert.equal(receipt.recipient, "0xabcd…abcd");
  assert.equal(receipt.explorerUrl, "https://robinhoodchain.blockscout.com/tx/0xaaaabbbbccccddddeeeeffff0000111122223333333344445555666677778888");
  assert.equal(JSON.stringify(receipt).includes("1234567890abcdef"), false);
});

test("does not invent an explorer link for unavailable transaction metadata", () => {
  const receipt = toPublicReceipt({ public_id: "rcpt_empty", amount_usdg: 1, network: null, asset: null, resource_name: null, payer_address: null, wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", tx_hash: null, settled_at: "2026-09-30T18:00:00.000Z" });
  assert.equal(receipt.network, "robinhood-mainnet");
  assert.equal(receipt.explorerUrl, null);
  assert.equal(receipt.resource, null);
});
