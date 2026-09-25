import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

interface InvoiceData {
  id: string;
  description: string;
  amountUsdg: number;
  network: string;
  status: string;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

async function fetchInvoice(id: string): Promise<InvoiceData | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.com";
  try {
    const res = await fetch(`${siteUrl}/api/invoice/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: { "User-Agent": "Verge-Internal/1.0" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await fetchInvoice(id);
  if (!inv) return { title: "Invoice not found — Verge" };
  return {
    title: `Pay ${inv.amountUsdg} USDG — Verge Invoice`,
    description: inv.description || "A Verge payment link",
  };
}

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await fetchInvoice(id);
  if (!inv) notFound();

  const expired = inv.expiresAt && inv.expiresAt < new Date().toISOString() && inv.status === "pending";
  const paid = inv.status === "paid";
  const networkLabel: Record<string, string> = {
    "robinhood-mainnet": "Robinhood Chain · USDG",
    "base-mainnet": "Base · USDC",
    "ethereum-mainnet": "Ethereum · USDC",
    "arbitrum-mainnet": "Arbitrum · USDC",
    "polygon-mainnet": "Polygon · USDC",
    "solana-mainnet": "Solana · USDC",
    "sui-mainnet": "Sui · USDC",
  };

  return (
    <main className="min-h-screen bg-[#171719] flex flex-col">
      <NavBar />
      <div className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          {/* Status badge */}
          <div className="mb-6 text-center">
            <span className={`inline-block rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase ${
              paid ? "border border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
              : expired ? "border border-rose-300/20 bg-rose-300/10 text-rose-300"
              : "border border-white/[0.08] bg-white/[0.03] text-white/40"
            }`}>
              {paid ? "✓ Paid" : expired ? "Expired" : "Awaiting payment"}
            </span>
          </div>

          <div className="rounded-3xl border border-white/[0.07] bg-[#1a1c1b] p-7">
            {/* Amount */}
            <div className="text-center">
              <div className="text-5xl font-semibold tracking-tight text-white">
                {inv.amountUsdg.toFixed(inv.amountUsdg < 0.01 ? 6 : inv.amountUsdg < 1 ? 4 : 2)}
              </div>
              <div className="mt-1 text-sm text-white/40">{networkLabel[inv.network] ?? inv.network}</div>
            </div>

            {/* Description */}
            {inv.description && (
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-center text-sm text-white/60">
                {inv.description}
              </div>
            )}

            {/* Details */}
            <div className="mt-5 space-y-2">
              {([
                ["Invoice ID", inv.id],
                ["Created", new Date(inv.createdAt).toLocaleString()],
                ...(inv.expiresAt ? [["Expires", new Date(inv.expiresAt).toLocaleString()]] : []),
                ...(paid && inv.paidAt ? [["Paid at", new Date(inv.paidAt).toLocaleString()]] : []),
              ] as [string,string][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-white/30">{label}</span>
                  <span className="font-mono text-[11px] text-white/60 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-7">
              {paid ? (
                <div className="rounded-xl border border-emerald-200/15 bg-emerald-200/[0.05] p-4 text-center">
                  <div className="text-sm font-medium text-emerald-200">Payment confirmed ✓</div>
                  <p className="mt-1 text-[10px] text-white/35">This invoice has been settled on-chain.</p>
                </div>
              ) : expired ? (
                <div className="rounded-xl border border-rose-200/15 bg-rose-200/[0.04] p-4 text-center">
                  <div className="text-sm font-medium text-rose-200">Invoice expired</div>
                  <p className="mt-1 text-[10px] text-white/35">Ask the sender to generate a new payment link.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <a href={`/app`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-200 px-4 py-3.5 text-sm font-semibold text-[#08120d] transition hover:bg-emerald-100"
                  >
                    Pay with Verge Wallet →
                  </a>
                  <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                    <div className="mb-2 text-[9px] uppercase tracking-[0.15em] text-white/30">Agent / CLI payment</div>
                    <code className="block break-all font-mono text-[10px] text-white/50">
                      {`POST /api/invoice/${inv.id}`}<br/>
                      {`Payment-Signature: <your-x402-proof>`}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-white/25">
            Powered by{" "}
            <a href="https://vergesnowy.com" className="text-white/40 hover:text-white/60">Verge</a>
            {" · "}HTTP 402 payments on Robinhood Chain
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
