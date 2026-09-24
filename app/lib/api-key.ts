import { createHash } from "node:crypto";
import { queryOne } from "@/app/lib/db";

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

async function lookupKey(rawKey: string): Promise<KeyRow | undefined> {
  const hash = createHash("sha256").update(rawKey).digest("hex");
  return queryOne<KeyRow>(
    `SELECT wallet, revoked_at as "revokedAt", quota_limit as "quotaLimit", usage_count as "usageCount", usage_date as "usageDate" FROM api_keys WHERE key_hash = $1`,
    [hash]
  );
}

/** Verify an X-API-Key header, enforce a rolling daily quota, and record usage. */
export async function checkApiKey(rawKey: string | null | undefined): Promise<KeyCheckResult> {
  if (!rawKey) return { ok: false, error: "MISSING_KEY" };
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const today = DAILY_RESET();

  // Single atomic UPDATE: reset usage_count to 0 on a new day, increment it
  // otherwise, but only when the (possibly-reset) count is still under quota.
  // This closes a check-then-write race where two concurrent requests could
  // both read a pre-increment count under the limit and both be allowed
  // through, burning more than quota_limit calls per day.
  const row = await queryOne<KeyRow & { newUsageCount: number }>(
    `UPDATE api_keys
     SET usage_count = CASE WHEN usage_date = $2 THEN usage_count + 1 ELSE 1 END,
         usage_date = $2,
         last_used_at = $3
     WHERE key_hash = $1
       AND revoked_at IS NULL
       AND (CASE WHEN usage_date = $2 THEN usage_count ELSE 0 END) < quota_limit
     RETURNING wallet, revoked_at as "revokedAt", quota_limit as "quotaLimit", usage_count as "newUsageCount", usage_date as "usageDate"`,
    [hash, today, new Date().toISOString()]
  );

  if (row) {
    return { ok: true, wallet: row.wallet, remaining: row.quotaLimit - row.newUsageCount, limit: row.quotaLimit };
  }

  // The UPDATE matched nothing: either the key doesn't exist, is revoked, or is over quota.
  const existing = await lookupKey(rawKey);
  if (!existing) return { ok: false, error: "INVALID_KEY" };
  if (existing.revokedAt) return { ok: false, error: "KEY_REVOKED" };
  return { ok: false, wallet: existing.wallet, remaining: 0, limit: existing.quotaLimit, error: "QUOTA_EXCEEDED" };
}

/**
 * Read-only introspection: reports whether a key is valid/revoked/quota state
 * WITHOUT consuming a quota unit. This is what third-party servers should call
 * to gate access to their own endpoints using a Verge-issued API key.
 */
export async function introspectApiKey(rawKey: string | null | undefined): Promise<KeyCheckResult> {
  if (!rawKey) return { ok: false, error: "MISSING_KEY" };
  const row = await lookupKey(rawKey);
  if (!row) return { ok: false, error: "INVALID_KEY" };
  if (row.revokedAt) return { ok: false, error: "KEY_REVOKED" };

  const today = DAILY_RESET();
  const usageCount = row.usageDate === today ? row.usageCount : 0;
  const remaining = Math.max(0, row.quotaLimit - usageCount);
  if (remaining <= 0) return { ok: false, wallet: row.wallet, remaining: 0, limit: row.quotaLimit, error: "QUOTA_EXCEEDED" };

  return { ok: true, wallet: row.wallet, remaining, limit: row.quotaLimit };
}
