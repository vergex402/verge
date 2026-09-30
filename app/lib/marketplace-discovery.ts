type Listing = { id: string; name: string; description: string; network: string; asset: string; price: number; hostedTemplate: string | null };
type Filters = { q?: string | null; network?: string | null; maxPrice?: number | null };

export function filterMarketplace(rows: Listing[], filters: Filters): Listing[] {
  const q = filters.q?.trim().toLowerCase();
  return rows.filter((row) => (!q || `${row.name} ${row.description} ${row.hostedTemplate || ""}`.toLowerCase().includes(q)) && (!filters.network || row.network === filters.network) && (filters.maxPrice == null || row.price <= filters.maxPrice));
}

const short = (value: unknown) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : undefined;
/** Whitelist normalized 402 fields from a remote response; never proxy raw headers. */
export function safePaymentRequirement(value: Record<string, unknown>) {
  const result: Record<string, string> = {};
  for (const key of ["amount", "asset", "network"] as const) if (typeof value[key] === "string" && value[key].length <= 128) result[key] = value[key];
  const payTo = short(value.payTo ?? value.recipient);
  if (payTo) result.payTo = payTo;
  return result;
}
