import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (Postgres connection string) is required — set it in the environment.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        wallet TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        last_four TEXT NOT NULL,
        quota_limit INTEGER NOT NULL DEFAULT 1000,
        usage_count INTEGER NOT NULL DEFAULT 0,
        usage_date TEXT,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        price_usdg DOUBLE PRECISION NOT NULL,
        description TEXT NOT NULL,
        health_status INTEGER,
        payment_required INTEGER NOT NULL DEFAULT 0,
        checked_at TEXT,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        actor_wallet TEXT,
        subject_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS audit_events_actor_wallet_idx ON audit_events(actor_wallet);
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket TEXT NOT NULL,
        window_start BIGINT NOT NULL,
        hits INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(bucket, window_start)
      );
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS payment_network TEXT NOT NULL DEFAULT 'robinhood-mainnet';
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS payment_asset TEXT NOT NULL DEFAULT 'USDG';
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS payment_chain_id INTEGER NOT NULL DEFAULT 4663;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS requests_count BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS paid_calls_count BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS settlement_volume DOUBLE PRECISION NOT NULL DEFAULT 0;
    `).then(() => undefined);
  }
  return schemaReady;
}

/** Run a query, ensuring the schema exists first. Positional params use $1, $2, ... */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Run a query and return only the first row, or undefined. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function cleanupAuth(): Promise<void> {
  const now = Date.now();
  await query("DELETE FROM challenges WHERE expires_at < $1", [now]);
  await query("DELETE FROM sessions WHERE expires_at < $1", [now]);
}

/** Append-only security/product audit log. Metadata must never include raw API keys or signatures. */
export async function audit(eventType: string, actorWallet?: string | null, subjectId?: string | null, metadata: Record<string, unknown> = {}): Promise<void> {
  await query("INSERT INTO audit_events(event_type, actor_wallet, subject_id, metadata) VALUES ($1, $2, $3, $4::jsonb)", [eventType, actorWallet || null, subjectId || null, JSON.stringify(metadata)]);
}

/** Distributed fixed-window limiter backed by Postgres. Returns true when this request is allowed. */
export async function allowRateLimit(bucket: string, maxHits: number, windowMs = 60_000): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await queryOne<{ hits: number }>(
    `INSERT INTO rate_limits(bucket, window_start, hits) VALUES ($1, $2, 1)
     ON CONFLICT(bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`, [bucket, windowStart]
  );
  if (Math.random() < 0.01) await query("DELETE FROM rate_limits WHERE window_start < $1", [now - windowMs * 3]);
  return (row?.hits || 0) <= maxHits;
}
