export type FeedEvent = {
  id: string;
  receiptUrl: string | null;
  amountUsdg: number;
  network: string;
  endpointName: string | null;
  truncatedPayer: string | null;
  settledAt: string;
};

type PersistedSettlement = {
  public_id?: string | null;
  id: number | string;
  amount_usdg: number;
  payment_network: string | null;
  endpoint_name: string | null;
  payer_address: string | null;
  settled_at: string | Date;
};

export function toFeedEvents(rows: PersistedSettlement[]): FeedEvent[] {
  return rows.map((row) => ({
    id: String(row.id),
    receiptUrl: row.public_id && /^rcpt_[a-f0-9]{32}$/.test(row.public_id) ? `/receipt/${row.public_id}` : null,
    amountUsdg: Number(row.amount_usdg),
    network: row.payment_network || "robinhood-mainnet",
    endpointName: row.endpoint_name,
    truncatedPayer: row.payer_address ? `${row.payer_address.slice(0, 6)}…${row.payer_address.slice(-4)}` : null,
    settledAt: new Date(row.settled_at).toISOString(),
  }));
}
