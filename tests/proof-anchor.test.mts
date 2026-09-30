// TDD: proof anchor — an on-chain anchor tx hash must be persisted with the
// batch and returned publicly, without ever exposing the anchor wallet.
import test from "node:test";
import assert from "node:assert/strict";
import { publicAnchor } from "../app/lib/proof-anchor.ts";

test("hides the anchor wallet and normalizes the anchor record", () => {
  const out = publicAnchor({
    anchor_tx: "0xabc123",
    anchor_wallet: "0x999888777666555444333222111000fffdddeeeccc",
    anchor_chain_id: 4663,
    anchored_at: "2026-09-30T19:00:00.000Z",
  });
  assert.deepEqual(out, {
    tx: "0xabc123",
    chainId: 4663,
    anchoredAt: "2026-09-30T19:00:00.000Z",
    explorerUrl: "https://robinhoodchain.blockscout.com/tx/0xabc123",
  });
  assert.equal(JSON.stringify(out).includes("999888777666555444333222111000fffdddeeeccc"), false);
});

test("returns null when a batch has never been anchored", () => {
  assert.equal(publicAnchor(null), null);
  assert.equal(publicAnchor({ anchor_tx: null, anchor_wallet: null, anchor_chain_id: null, anchored_at: null }), null);
});
