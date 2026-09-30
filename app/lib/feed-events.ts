export type FeedEvent = {
  id: string;
  amountUsdg: number;
  network: string;
  endpointName: string | null;
  truncatedPayer: string | null;
  settledAt: string;
};

type PersistedSettlement = {
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
    amountUsdg: Number(row.amount_usdg),
    network: row.payment_network || "robinhood-mainnet",
    endpointName: row.endpoint_name,
    truncatedPayer: row.payer_address ? `${row.payer_address.slice(0, 6)}…${row.payer_address.slice(-4)}` : null,
    settledAt: new Date(row.settled_at).toISOString(),
  }));
}
