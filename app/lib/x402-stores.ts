// Postgres-backed x402 challenge/replay stores for hosted endpoints.
// Each hosted endpoint (/x/<slug>) shares the same DB-backed stores so
// nonces and settlement replay protection survive server restarts and
// work correctly across multiple app instances.

import type { Challenge, ChallengeStore, PaymentNetwork, ReplayStore } from "@vergex402/core";
import { query, queryOne } from "@/app/lib/db";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export const pgChallengeStore: ChallengeStore = {
  async add(challenge: Challenge) {
    await query(
      `INSERT INTO x402_nonces(nonce, network, recipient, amount, expires_at) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (nonce) DO UPDATE SET network = EXCLUDED.network, recipient = EXCLUDED.recipient, amount = EXCLUDED.amount, expires_at = EXCLUDED.expires_at`,
      [challenge.nonce, challenge.network, challenge.recipient.toLowerCase(), challenge.amount, Date.now() + CHALLENGE_TTL_MS]
    );
  },
  async consume(nonce, expected) {
    const row = await queryOne<{ network: string; recipient: string; amount: number; expiresAt: string }>(
      `DELETE FROM x402_nonces WHERE nonce = $1 RETURNING network, recipient, amount, expires_at as "expiresAt"`,
      [nonce]
    );
    if (!row) return null;
    if (Number(row.expiresAt) < Date.now()) return null;
    if (row.network !== expected.network) return null;
    if (row.recipient.toLowerCase() !== expected.recipient.toLowerCase()) return null;
    if (Number(row.amount) !== expected.amount) return null;
    return { nonce, amount: Number(row.amount), token: "", tokenRef: "", network: row.network as PaymentNetwork, chainId: null, recipient: row.recipient, memo: "" };
  },
};

export const pgReplayStore: ReplayStore = {
  async has(txHash: string) {
    const row = await queryOne(`SELECT 1 FROM x402_settlements WHERE replay_key = $1`, [txHash]);
    return Boolean(row);
  },
  async add(txHash: string) {
    await query(`INSERT INTO x402_settlements(replay_key) VALUES ($1) ON CONFLICT DO NOTHING`, [txHash]);
  },
};
