// vault.ts — credential broker for AI agents, Postgres-backed (ported from
// Tribute's agent-vault.js, adapted to Verge's Postgres + wallet-scoped model).
//
// Agents never hold real credentials in the clear. A wallet-authorized owner
// stores a secret once; agents reference it by {{name}} and Verge substitutes
// the real value server-side. Entries are AES-256-GCM encrypted before they
// ever touch the database — plaintext exists only in memory, only as long as
// a single put()/get() call needs it.
import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { query, queryOne } from "@/app/lib/db";

function vaultKey(): Buffer {
  const raw = process.env.VERGE_VAULT_KEY || createHash("sha256").update(process.env.DATABASE_URL || "verge-local").digest();
  return createHash("sha256").update(raw).digest();
}
if (!process.env.VERGE_VAULT_KEY) {
  console.warn("[vault] VERGE_VAULT_KEY not set — encryption key derived from DATABASE_URL. Set VERGE_VAULT_KEY in production.");
}

const NAME_RE = /^[a-zA-Z0-9_.-]{1,64}$/;

export interface VaultEntryMeta {
  name: string;
  createdAt: number;
  hits: number;
  encLen: number;
}

/** Encrypts and stores a secret under `name`, scoped to `ownerWallet`. Overwrites any existing entry with that name+owner. */
export async function vaultPut(ownerWallet: string, name: string, value: string): Promise<{ name: string; createdAt: number }> {
  if (!NAME_RE.test(name)) throw new Error("name must be 1-64 chars of [A-Za-z0-9_.-]");
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) throw new Error("value must be a non-empty string ≤ 4096 chars");
  const owner = ownerWallet.toLowerCase();
  const scopedName = `${owner}:${name}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const createdAt = Date.now();
  await query(
    `INSERT INTO vault_entries(name, enc, iv, tag, owner_wallet, created_at, hits) VALUES ($1,$2,$3,$4,$5,$6,0)
     ON CONFLICT (name) DO UPDATE SET enc = EXCLUDED.enc, iv = EXCLUDED.iv, tag = EXCLUDED.tag, created_at = EXCLUDED.created_at, hits = 0`,
    [scopedName, enc.toString("base64"), iv.toString("base64"), cipher.getAuthTag().toString("base64"), owner, createdAt]
  );
  await vaultAudit("put", scopedName);
  return { name, createdAt };
}

interface VaultRow { enc: string; iv: string; tag: string }

/** Decrypts and returns the secret for `name` under `ownerWallet`, or null if it doesn't exist. Bumps the hit counter. */
export async function vaultGet(ownerWallet: string, name: string): Promise<string | null> {
  const scopedName = `${ownerWallet.toLowerCase()}:${name}`;
  const row = await queryOne<VaultRow>(`SELECT enc, iv, tag FROM vault_entries WHERE name = $1`, [scopedName]);
  if (!row) return null;
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  const value = Buffer.concat([decipher.update(Buffer.from(row.enc, "base64")), decipher.final()]).toString("utf8");
  await query(`UPDATE vault_entries SET hits = hits + 1 WHERE name = $1`, [scopedName]);
  await vaultAudit("broker", scopedName);
  return value;
}

/** Lists entry metadata (never plaintext or ciphertext) for a given owner. */
export async function vaultList(ownerWallet: string): Promise<VaultEntryMeta[]> {
  const owner = ownerWallet.toLowerCase();
  const rows = await query<{ name: string; createdAt: string; hits: string; encLen: number }>(
    `SELECT name, created_at as "createdAt", hits, length(enc) as "encLen" FROM vault_entries WHERE owner_wallet = $1 ORDER BY created_at DESC`,
    [owner]
  );
  return rows.map((r) => ({ name: r.name.slice(owner.length + 1), createdAt: Number(r.createdAt), hits: Number(r.hits), encLen: r.encLen }));
}

/** Permanently deletes a secret. */
export async function vaultDelete(ownerWallet: string, name: string): Promise<boolean> {
  const scopedName = `${ownerWallet.toLowerCase()}:${name}`;
  const rows = await query(`DELETE FROM vault_entries WHERE name = $1 RETURNING name`, [scopedName]);
  if (rows.length) await vaultAudit("delete", scopedName);
  return rows.length > 0;
}

export async function vaultAudit(kind: string, name?: string, detail?: string): Promise<void> {
  await query(`INSERT INTO vault_audit(t, kind, name, detail) VALUES ($1,$2,$3,$4)`, [Date.now(), kind, name || null, detail || null]);
}

export async function vaultAuditRecent(ownerWallet: string, limit = 20) {
  const owner = ownerWallet.toLowerCase();
  const rows = await query<{ t: string; kind: string; name: string; detail: string | null }>(
    `SELECT t, kind, name, detail FROM vault_audit WHERE name LIKE $1 ORDER BY t DESC LIMIT $2`,
    [`${owner}:%`, limit]
  );
  return rows.map((r) => ({ t: Number(r.t), kind: r.kind, name: r.name?.slice(owner.length + 1) ?? null, detail: r.detail }));
}

/**
 * Substitutes {{name}} placeholders in a string with the owner's vaulted
 * secrets. Used so an agent's request template never contains the real
 * credential — only a reference the server resolves at call time.
 */
export async function vaultSubstitute(ownerWallet: string, template: string): Promise<string> {
  const names = [...template.matchAll(/\{\{([a-zA-Z0-9_.-]{1,64})\}\}/g)].map((m) => m[1]);
  let out = template;
  for (const name of new Set(names)) {
    const value = await vaultGet(ownerWallet, name);
    if (value !== null) out = out.split(`{{${name}}}`).join(value);
  }
  return out;
}
