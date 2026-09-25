// wallets.ts — agent wallets on Robinhood Chain 4663, Postgres-backed
// (ported from Tribute's wallets.js). Private key is shown to the owner
// exactly once at creation, then stored only in the encrypted vault —
// never in plaintext, never logged, never returned again.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { query, queryOne } from "@/app/lib/db";
import { vaultPut, vaultAudit } from "@/app/lib/vault";

function slug(label: string) {
  return String(label || "agent").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "agent";
}

export interface AgentWalletCreated {
  label: string;
  address: string;
  vaultRef: string;
  chainId: number;
  createdAt: number;
  privateKey: string;
  note: string;
}

/** Generates a new EVM keypair, vaults the private key under the owner wallet, and records the public address. */
export async function createAgentWallet(ownerWallet: string, label?: string): Promise<AgentWalletCreated> {
  const owner = ownerWallet.toLowerCase();
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const tag = slug(label || "agent");
  const vaultRef = `wallet_${tag}_${Date.now().toString(36)}`.slice(0, 64);

  await vaultPut(owner, vaultRef, privateKey);
  await vaultAudit("wallet", `${owner}:${vaultRef}`);

  const createdAt = Date.now();
  await query(
    `INSERT INTO agent_wallets(address, owner_wallet, label, vault_ref, chain_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [account.address.toLowerCase(), owner, String(label || "agent").slice(0, 40), vaultRef, 4663, createdAt]
  );

  return {
    label: String(label || "agent").slice(0, 40),
    address: account.address,
    vaultRef,
    chainId: 4663,
    createdAt,
    privateKey,
    note: "Private key shown once. Copy it now — Verge stores only an encrypted copy and will never display it again.",
  };
}

export interface AgentWalletSummary {
  label: string;
  address: string;
  vaultRef: string;
  chainId: number;
  createdAt: number;
  maxPerCall?: number | null;
  dailyBudget?: number | null;
  allowedDomains?: string[] | null;
  spentToday?: number;
}

/** Lists wallets owned by this session wallet (public addresses + metadata only, never keys). */
export async function listAgentWallets(ownerWallet: string): Promise<AgentWalletSummary[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await query<{
    label: string; address: string; vaultRef: string; chainId: number; createdAt: string;
    maxPerCall: number | null; dailyBudget: number | null; allowedDomains: string[] | null;
    spentToday: number; spendDate: string | null;
  }>(
    `SELECT label, address, vault_ref as "vaultRef", chain_id as "chainId", created_at as "createdAt",
      max_per_call as "maxPerCall", daily_budget as "dailyBudget", allowed_domains as "allowedDomains",
      spent_today as "spentToday", spend_date as "spendDate"
     FROM agent_wallets WHERE owner_wallet = $1 ORDER BY created_at DESC`,
    [ownerWallet.toLowerCase()]
  );
  return rows.map((r) => ({
    ...r,
    createdAt: Number(r.createdAt),
    spentToday: r.spendDate === today ? Number(r.spentToday) : 0,
  }));
}

/** Update budget settings for an agent wallet. */
export async function updateAgentWalletBudget(
  ownerWallet: string,
  address: string,
  opts: { maxPerCall?: number | null; dailyBudget?: number | null; allowedDomains?: string[] | null }
): Promise<void> {
  await query(
    `UPDATE agent_wallets SET max_per_call = $1, daily_budget = $2, allowed_domains = $3
     WHERE address = $4 AND owner_wallet = $5`,
    [opts.maxPerCall ?? null, opts.dailyBudget ?? null, opts.allowedDomains ?? null,
     address.toLowerCase(), ownerWallet.toLowerCase()]
  );
}

/** Check if an agent wallet can spend the given amount on the given URL. Returns null if ok, error string if blocked. */
export async function checkAgentBudget(
  walletAddress: string,
  amountUsdg: number,
  endpointUrl?: string
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await queryOne<{
    maxPerCall: number | null; dailyBudget: number | null; allowedDomains: string[] | null;
    spentToday: number; spendDate: string | null;
  }>(
    `SELECT max_per_call as "maxPerCall", daily_budget as "dailyBudget", allowed_domains as "allowedDomains",
      spent_today as "spentToday", spend_date as "spendDate"
     FROM agent_wallets WHERE address = $1`,
    [walletAddress.toLowerCase()]
  );
  if (!row) return null; // wallet not in system, allow

  if (row.maxPerCall != null && amountUsdg > row.maxPerCall) {
    return `Payment blocked: ${amountUsdg} USDG exceeds max_per_call limit of ${row.maxPerCall} USDG for this agent wallet.`;
  }

  if (row.dailyBudget != null) {
    const spentToday = row.spendDate === today ? Number(row.spentToday) : 0;
    if (spentToday + amountUsdg > row.dailyBudget) {
      return `Payment blocked: daily budget of ${row.dailyBudget} USDG reached (${spentToday.toFixed(6)} spent today).`;
    }
  }

  if (row.allowedDomains && row.allowedDomains.length > 0 && endpointUrl) {
    try {
      const host = new URL(endpointUrl).hostname;
      const allowed = row.allowedDomains.some((d: string) => host === d || host.endsWith(`.${d}`));
      if (!allowed) {
        return `Payment blocked: ${host} is not in the allowed_domains list for this agent wallet.`;
      }
    } catch { /* invalid url, allow */ }
  }

  return null;
}

/** Record a spend against an agent wallet's daily budget. */
export async function recordAgentSpend(
  walletAddress: string,
  ownerWallet: string,
  amountUsdg: number,
  endpointUrl?: string,
  txHash?: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await query(
    `UPDATE agent_wallets
     SET spent_today = CASE WHEN spend_date = $2 THEN spent_today + $3 ELSE $3 END,
         spend_date = $2
     WHERE address = $1`,
    [walletAddress.toLowerCase(), today, amountUsdg]
  );
  await query(
    `INSERT INTO agent_wallet_spends(wallet_address, owner_wallet, amount_usdg, endpoint_url, tx_hash)
     VALUES ($1,$2,$3,$4,$5)`,
    [walletAddress.toLowerCase(), ownerWallet.toLowerCase(), amountUsdg, endpointUrl || null, txHash || null]
  );
}
