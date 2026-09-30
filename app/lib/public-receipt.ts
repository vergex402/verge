type ReceiptRow = {
  public_id: string;
  amount_usdg: number;
  network: string | null;
  asset: string | null;
  resource_name: string | null;
  payer_address: string | null;
  wallet: string;
  tx_hash: string | null;
  settled_at: string | Date;
};

const truncateAddress = (address: string | null) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

export function toPublicReceipt(row: ReceiptRow) {
  const network = row.network || "robinhood-mainnet";
  const explorerUrl = row.tx_hash && network === "robinhood-mainnet"
    ? `https://robinhoodchain.blockscout.com/tx/${row.tx_hash}`
    : null;
  return {
    id: row.public_id,
    amount: Number(row.amount_usdg),
    asset: row.asset || "USDG",
    network,
    resource: row.resource_name || null,
    payer: truncateAddress(row.payer_address),
    recipient: truncateAddress(row.wallet),
    settledAt: new Date(row.settled_at).toISOString(),
    explorerUrl,
  };
}
