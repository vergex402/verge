import assert from "node:assert/strict";
import test from "node:test";
import { API_WRITE_BODY_LIMIT_BYTES, isApiWriteBodyTooLarge } from "../app/lib/request-security.ts";

test("rejects API write bodies larger than 64 KiB", () => {
  assert.equal(API_WRITE_BODY_LIMIT_BYTES, 65_536);
  assert.equal(isApiWriteBodyTooLarge("POST", new Headers({ "content-length": "65537" })), true);
  assert.equal(isApiWriteBodyTooLarge("PUT", new Headers({ "content-length": "65537" })), true);
  assert.equal(isApiWriteBodyTooLarge("PATCH", new Headers({ "content-length": "65537" })), true);
});

test("allows 64 KiB and ignores non-write or absent content lengths", () => {
  assert.equal(isApiWriteBodyTooLarge("POST", new Headers({ "content-length": "65536" })), false);
  assert.equal(isApiWriteBodyTooLarge("GET", new Headers({ "content-length": "999999" })), false);
  assert.equal(isApiWriteBodyTooLarge("POST", new Headers()), false);
});

test("rejects malformed content lengths before JSON parsing", () => {
  assert.equal(isApiWriteBodyTooLarge("POST", new Headers({ "content-length": "not-a-number" })), true);
  assert.equal(isApiWriteBodyTooLarge("POST", new Headers({ "content-length": "-1" })), true);
});
