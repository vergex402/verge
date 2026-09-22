import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const path = process.env.VERGE_DB_PATH || `${process.cwd()}/.data/verge.db`;
mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS challenges (
    wallet TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
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
    price_usdg REAL NOT NULL,
    description TEXT NOT NULL,
    health_status INTEGER,
    payment_required INTEGER NOT NULL DEFAULT 0,
    checked_at TEXT,
    created_at TEXT NOT NULL,
    revoked_at TEXT
  );
`);

for (const column of [
  "ALTER TABLE endpoints ADD COLUMN health_status INTEGER",
  "ALTER TABLE endpoints ADD COLUMN payment_required INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE endpoints ADD COLUMN checked_at TEXT",
  "ALTER TABLE api_keys ADD COLUMN quota_limit INTEGER NOT NULL DEFAULT 1000",
  "ALTER TABLE api_keys ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE api_keys ADD COLUMN usage_date TEXT",
  "ALTER TABLE api_keys ADD COLUMN last_used_at TEXT",
]) {
  try { db.exec(column); } catch { /* existing database already has this column */ }
}

export function cleanupAuth() {
  const now = Date.now();
  db.prepare("DELETE FROM challenges WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
}
