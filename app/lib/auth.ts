import { randomBytes } from "node:crypto";
import { verifyMessage } from "viem";
import { cleanupAuth, query, queryOne } from "@/app/lib/db";

const TTL = 5 * 60 * 1000;
const SESSION_TTL = 60 * 60 * 1000;

export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export async function makeChallenge(address: string) {
  await cleanupAuth();
  const wallet = normalizeAddress(address);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const message = `Sign in to Verge Gateway\n\nWallet: ${wallet}\nNonce: ${nonce}\nIssued At: ${issuedAt}\n\nThis request will not trigger a blockchain transaction or cost any gas.`;
  const expiresAt = Date.now() + TTL;
  await query(
    "INSERT INTO challenges(wallet, message, expires_at) VALUES ($1, $2, $3) ON CONFLICT (wallet) DO UPDATE SET message = EXCLUDED.message, expires_at = EXCLUDED.expires_at",
    [wallet, message, expiresAt]
  );
  return { message, expiresAt };
}

export async function consumeChallenge(address: string, message: string, signature: string) {
  await cleanupAuth();
  const wallet = normalizeAddress(address);
  const row = await queryOne<{ message: string }>(
    "SELECT message FROM challenges WHERE wallet = $1 AND expires_at >= $2",
    [wallet, Date.now()]
  );
  if (!row || row.message !== message) return false;
  await query("DELETE FROM challenges WHERE wallet = $1", [wallet]);
  try {
    return await verifyMessage({ address: wallet as `0x${string}`, message, signature: signature as `0x${string}` });
  } catch {
    return false;
  }
}

export async function createSession(address: string) {
  await cleanupAuth();
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL;
  await query(
    "INSERT INTO sessions(token, wallet, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [token, normalizeAddress(address), expiresAt, new Date().toISOString()]
  );
  return { token, expiresAt };
}

export async function sessionAddress(token: string | undefined) {
  if (!token) return null;
  await cleanupAuth();
  const row = await queryOne<{ wallet: string }>(
    "SELECT wallet FROM sessions WHERE token = $1 AND expires_at >= $2",
    [token, Date.now()]
  );
  return row?.wallet || null;
}
