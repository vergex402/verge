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
