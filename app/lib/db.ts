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
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS payment_chain_id INTEGER;
      ALTER TABLE endpoints ALTER COLUMN payment_chain_id DROP NOT NULL;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS requests_count BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS paid_calls_count BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS settlement_volume DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS hosted_slug TEXT UNIQUE;
      ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS hosted_template TEXT;
      CREATE TABLE IF NOT EXISTS x402_nonces (
        nonce TEXT PRIMARY KEY,
        network TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        endpoint_id TEXT,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS x402_settlements (
        replay_key TEXT PRIMARY KEY,
        endpoint_id TEXT,
        settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS vault_entries (
        name TEXT PRIMARY KEY,
        enc TEXT NOT NULL,
        iv TEXT NOT NULL,
        tag TEXT NOT NULL,
        owner_wallet TEXT,
        created_at BIGINT NOT NULL,
        hits BIGINT NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS vault_entries_owner_idx ON vault_entries(owner_wallet);
      CREATE TABLE IF NOT EXISTS vault_audit (
        id BIGSERIAL PRIMARY KEY,
        t BIGINT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT,
        detail TEXT
      );
      CREATE TABLE IF NOT EXISTS agent_wallets (
        address TEXT PRIMARY KEY,
        owner_wallet TEXT NOT NULL,
        label TEXT NOT NULL,
        vault_ref TEXT NOT NULL,
        chain_id INTEGER NOT NULL DEFAULT 4663,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS agent_wallets_owner_idx ON agent_wallets(owner_wallet);
      CREATE TABLE IF NOT EXISTS reputation (
        address TEXT PRIMARY KEY,
        first_seen BIGINT NOT NULL,
        last_seen BIGINT NOT NULL,
        settled_count BIGINT NOT NULL DEFAULT 0,
        total_usdg DOUBLE PRECISION NOT NULL DEFAULT 0,
        resources JSONB NOT NULL DEFAULT '{}'::jsonb,
        txs JSONB NOT NULL DEFAULT '[]'::jsonb
      );
      CREATE INDEX IF NOT EXISTS reputation_rank_idx ON reputation(settled_count DESC, total_usdg DESC);
      CREATE TABLE IF NOT EXISTS payments_log (
        id BIGSERIAL PRIMARY KEY,
        wallet TEXT NOT NULL,
        payer_address TEXT,
        amount_usdg DOUBLE PRECISION NOT NULL DEFAULT 0,
        endpoint_id TEXT,
        settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS payments_log_wallet_idx ON payments_log(wallet, settled_at DESC);
      CREATE INDEX IF NOT EXISTS payments_log_payer_idx ON payments_log(payer_address);

      -- API key enhancements: label + expiry
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TEXT;
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_endpoints TEXT[] DEFAULT NULL;

      -- Webhooks: developer-registered HTTP callbacks fired on events
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{payment.settled,endpoint.called}',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL,
        last_fired_at TEXT,
        last_status INTEGER,
        fire_count INTEGER NOT NULL DEFAULT 0,
        fail_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS webhooks_wallet_idx ON webhooks(wallet);

      -- Invoices: single-use shareable payment links
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        amount_usdg DOUBLE PRECISION NOT NULL,
        network TEXT NOT NULL DEFAULT 'robinhood-mainnet',
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TEXT,
        payer_address TEXT,
        tx_hash TEXT,
        expires_at TEXT,
        endpoint_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS invoices_wallet_idx ON invoices(wallet, created_at DESC);

      -- Sandbox mode flag per wallet session
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sandbox BOOLEAN NOT NULL DEFAULT FALSE;

      -- Agent wallet budget engine
      ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS max_per_call DOUBLE PRECISION;
      ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS daily_budget DOUBLE PRECISION;
      ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS allowed_domains TEXT[];
      ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS spent_today DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS spend_date TEXT;

      -- Agent wallet spend log
      CREATE TABLE IF NOT EXISTS agent_wallet_spends (
        id BIGSERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        owner_wallet TEXT NOT NULL,
        amount_usdg DOUBLE PRECISION NOT NULL,
        endpoint_url TEXT,
        tx_hash TEXT,
        spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS aws_wallet_idx ON agent_wallet_spends(wallet_address, spent_at DESC);
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
