import { createHash } from "node:crypto";
import { db } from "@/app/lib/db";

const DAILY_RESET = () => new Date().toISOString().slice(0, 10);

export interface KeyCheckResult {
  ok: boolean;
  wallet?: string;
  remaining?: number;
  limit?: number;
  error?: "MISSING_KEY" | "INVALID_KEY" | "KEY_REVOKED" | "QUOTA_EXCEEDED";
}

interface KeyRow {
  wallet: string;
  revokedAt: string | null;
  quotaLimit: number;
  usageCount: number;
  usageDate: string | null;
}

function lookupKey(rawKey: string): KeyRow | undefined {
  const hash = createHash("sha256").update(rawKey).digest("hex");
  return db.prepare(
    "SELECT wallet, revoked_at as revokedAt, quota_limit as quotaLimit, usage_count as usageCount, usage_date as usageDate FROM api_keys WHERE key_hash = ?"
  ).get(hash) as KeyRow | undefined;
}

/** Verify an X-API-Key header, enforce a rolling daily quota, and record usage. */
export function checkApiKey(rawKey: string | null | undefined): KeyCheckResult {
  if (!rawKey) return { ok: false, error: "MISSING_KEY" };
  const row = lookupKey(rawKey);
  if (!row) return { ok: false, error: "INVALID_KEY" };
  if (row.revokedAt) return { ok: false, error: "KEY_REVOKED" };

  const today = DAILY_RESET();
  const usageCount = row.usageDate === today ? row.usageCount : 0;
  if (usageCount >= row.quotaLimit) return { ok: false, wallet: row.wallet, remaining: 0, limit: row.quotaLimit, error: "QUOTA_EXCEEDED" };

  const hash = createHash("sha256").update(rawKey).digest("hex");
  db.prepare("UPDATE api_keys SET usage_count = ?, usage_date = ?, last_used_at = ? WHERE key_hash = ?")
    .run(usageCount + 1, today, new Date().toISOString(), hash);

  return { ok: true, wallet: row.wallet, remaining: row.quotaLimit - usageCount - 1, limit: row.quotaLimit };
}

/**
 * Read-only introspection: reports whether a key is valid/revoked/quota state
 * WITHOUT consuming a quota unit. This is what third-party servers should call
 * to gate access to their own endpoints using a Verge-issued API key.
 */
export function introspectApiKey(rawKey: string | null | undefined): KeyCheckResult {
  if (!rawKey) return { ok: false, error: "MISSING_KEY" };
  const row = lookupKey(rawKey);
  if (!row) return { ok: false, error: "INVALID_KEY" };
  if (row.revokedAt) return { ok: false, error: "KEY_REVOKED" };

  const today = DAILY_RESET();
  const usageCount = row.usageDate === today ? row.usageCount : 0;
  const remaining = Math.max(0, row.quotaLimit - usageCount);
  if (remaining <= 0) return { ok: false, wallet: row.wallet, remaining: 0, limit: row.quotaLimit, error: "QUOTA_EXCEEDED" };

  return { ok: true, wallet: row.wallet, remaining, limit: row.quotaLimit };
}
