export type AnchorRow = {
  anchor_tx: string | null;
  anchor_wallet: string | null;
  anchor_chain_id: number | null;
  anchored_at: string | null;
};

export type PublicAnchor = {
  tx: string;
  chainId: number;
  anchoredAt: string;
  explorerUrl: string;
};

const EXPLORER = "https://robinhoodchain.blockscout.com/tx/";

export function publicAnchor(row: AnchorRow | null): PublicAnchor | null {
  if (!row?.anchor_tx) return null;
  return {
    tx: row.anchor_tx,
    chainId: row.anchor_chain_id || 4663,
    anchoredAt: row.anchored_at ? new Date(row.anchored_at).toISOString() : "",
    explorerUrl: `${EXPLORER}${row.anchor_tx}`,
  };
}
