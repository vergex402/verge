// wallets.ts — agent wallets on Robinhood Chain 4663, Postgres-backed
// (ported from Tribute's wallets.js). Private key is shown to the owner
// exactly once at creation, then stored only in the encrypted vault —
// never in plaintext, never logged, never returned again.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { query } from "@/app/lib/db";
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
}

/** Lists wallets owned by this session wallet (public addresses + metadata only, never keys). */
export async function listAgentWallets(ownerWallet: string): Promise<AgentWalletSummary[]> {
  const rows = await query<{ label: string; address: string; vaultRef: string; chainId: number; createdAt: string }>(
    `SELECT label, address, vault_ref as "vaultRef", chain_id as "chainId", created_at as "createdAt" FROM agent_wallets WHERE owner_wallet = $1 ORDER BY created_at DESC`,
    [ownerWallet.toLowerCase()]
  );
  return rows.map((r) => ({ ...r, createdAt: Number(r.createdAt) }));
}
