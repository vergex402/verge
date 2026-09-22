import { randomBytes } from "node:crypto";
import { verifyMessage } from "viem";
import { cleanupAuth, db } from "@/app/lib/db";

const TTL = 5 * 60 * 1000;
const SESSION_TTL = 60 * 60 * 1000;

export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function makeChallenge(address: string) {
  cleanupAuth();
  const wallet = normalizeAddress(address);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const message = `Sign in to Verge Gateway\n\nWallet: ${wallet}\nNonce: ${nonce}\nIssued At: ${issuedAt}\n\nThis request will not trigger a blockchain transaction or cost any gas.`;
  const expiresAt = Date.now() + TTL;
  db.prepare("INSERT OR REPLACE INTO challenges(wallet, message, expires_at) VALUES (?, ?, ?)").run(wallet, message, expiresAt);
  return { message, expiresAt };
}

export async function consumeChallenge(address: string, message: string, signature: string) {
  cleanupAuth();
  const wallet = normalizeAddress(address);
  const row = db.prepare("SELECT message FROM challenges WHERE wallet = ? AND expires_at >= ?").get(wallet, Date.now()) as { message?: string } | undefined;
  if (!row || row.message !== message) return false;
  db.prepare("DELETE FROM challenges WHERE wallet = ?").run(wallet);
  try {
    return await verifyMessage({ address: wallet as `0x${string}`, message, signature: signature as `0x${string}` });
  } catch {
    return false;
  }
}

export function createSession(address: string) {
  cleanupAuth();
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL;
  db.prepare("INSERT INTO sessions(token, wallet, expires_at, created_at) VALUES (?, ?, ?, ?)").run(token, normalizeAddress(address), expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

export function sessionAddress(token: string | undefined) {
  if (!token) return null;
  cleanupAuth();
  const row = db.prepare("SELECT wallet FROM sessions WHERE token = ? AND expires_at >= ?").get(token, Date.now()) as { wallet?: string } | undefined;
  return row?.wallet || null;
}
