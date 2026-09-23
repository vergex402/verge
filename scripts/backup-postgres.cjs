#!/usr/bin/env node
/** Daily Verge Postgres backup. Writes a gzip JSON snapshot; keeps 14 days. */
const { Pool } = require('pg');
const { gzipSync } = require('zlib');
const { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } = require('fs');
const { join } = require('path');

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const outDir = process.env.VERGE_BACKUP_DIR || '/var/backups/verge';
mkdirSync(outDir, { recursive: true, mode: 0o700 });

(async () => {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const tables = ['challenges', 'sessions', 'api_keys', 'endpoints', 'audit_events'];
  const snapshot = { format: 'verge-postgres-backup/v1', createdAt: new Date().toISOString(), tables: {} };
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      snapshot.tables[table] = result.rows;
    } catch (error) {
      // Schema can be rolling out while a deploy is in flight; keep the backup usable.
      if (error && error.code === '42P01') snapshot.tables[table] = [];
      else throw error;
    }
  }
  await pool.end();
  const stamp = snapshot.createdAt.replace(/[:.]/g, '-');
  const dest = join(outDir, `verge-${stamp}.json.gz`);
  writeFileSync(dest, gzipSync(JSON.stringify(snapshot)), { mode: 0o600 });
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const name of readdirSync(outDir)) {
    const full = join(outDir, name);
    if (name.endsWith('.json.gz') && statSync(full).mtimeMs < cutoff) unlinkSync(full);
  }
  console.log(JSON.stringify({ ok: true, file: dest, tableCounts: Object.fromEntries(Object.entries(snapshot.tables).map(([k,v]) => [k,v.length])) }));
})().catch((error) => { console.error(error); process.exit(1); });
