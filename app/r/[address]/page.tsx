import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

interface RepScore {
  address: string;
  score: number;
  tier: string;
  settledCount: number;
  totalUsdg: number;
  firstSeen: number | null;
  lastSeen: number | null;
  txHashes: string[];
}

async function fetchRep(address: string): Promise<RepScore | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vergesnowy.com";
  try {
    const res = await fetch(`${siteUrl}/api/reputation?address=${encodeURIComponent(address)}`, {
      cache: "no-store", headers: { "User-Agent": "Verge-Internal/1.0" },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.score > 0 || d.settledCount > 0 ? d : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return {
    title: `Reputation · ${address.slice(0, 8)}… — Verge`,
    description: "On-chain reputation score derived from settled x402 payments via Verge.",
  };
}

export default async function ReputationPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) notFound();
  const rep = await fetchRep(address);

  const tierColor: Record<string, string> = {
    trusted: "text-emerald-300",
    established: "text-emerald-200/70",
    new: "text-white/60",
    unknown: "text-white/30",
  };
  const tierBg: Record<string, string> = {
    trusted: "border-emerald-300/20 bg-emerald-300/[0.07]",
    established: "border-emerald-200/15 bg-emerald-200/[0.04]",
    new: "border-white/[0.07] bg-white/[0.02]",
    unknown: "border-white/[0.05] bg-white/[0.01]",
  };

  return (
    <main className="min-h-screen bg-[#171719]">
      <NavBar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20">
        <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">On-chain reputation</div>
        <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl break-all">
          {address.slice(0, 10)}&hellip;{address.slice(-8)}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-white/30 break-all">{address}</p>

        {!rep ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] p-10 text-center">
            <div className="text-sm font-medium text-white/50">No reputation data yet</div>
            <p className="mt-2 text-[11px] text-white/30">
              This address hasn't settled any x402 payments through Verge's facilitator.
            </p>
          </div>
        ) : (
          <>
            {/* Score hero */}
            <div className={`mt-8 rounded-2xl border p-6 ${tierBg[rep.tier] ?? tierBg.unknown}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">Reputation score</div>
                  <div className="mt-2 text-6xl font-semibold text-white">{rep.score}</div>
                  <div className={`mt-1 text-sm font-semibold uppercase tracking-wide ${tierColor[rep.tier] ?? "text-white/30"}`}>
                    {rep.tier}
                  </div>
                </div>
                <div className="text-right space-y-4">
                  {[
                    ["Settled calls", rep.settledCount.toString()],
                    ["Total paid", `${rep.totalUsdg.toFixed(4)} USDG`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[9px] text-white/30">{l}</div>
                      <div className="mt-0.5 text-sm font-medium text-white/80">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["First seen", rep.firstSeen ? new Date(rep.firstSeen).toLocaleDateString() : "—"],
                ["Last active", rep.lastSeen ? new Date(rep.lastSeen).toLocaleDateString() : "—"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="text-[9px] text-white/30">{l}</div>
                  <div className="mt-1 text-sm text-white/75">{v}</div>
                </div>
              ))}
            </div>

            {/* Verified tx anchors */}
            {rep.txHashes.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 text-[10px] uppercase tracking-[0.15em] text-white/30">
                  Verified settlement anchors ({rep.txHashes.length})
                </div>
                <div className="space-y-2">
                  {rep.txHashes.slice(0, 5).map((tx) => (
                    <a key={tx} href={`https://robinhoodchain.blockscout.com/tx/${tx}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5 transition hover:border-white/[0.12]">
                      <span className="font-mono text-[10px] text-white/55 truncate">{tx.slice(0, 20)}…{tx.slice(-10)}</span>
                      <span className="ml-auto text-[9px] text-white/25">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-[10px] text-white/25">
              Score is derived from settled on-chain payments only. Every claim is anchored to a verifiable transaction hash.
            </p>
          </>
        )}

        <div className="mt-10 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-center text-[10px] text-white/30">
          Powered by <a href="https://vergesnowy.com" className="text-white/45 hover:text-white/65">Verge</a> · HTTP 402 payment infrastructure
        </div>
      </div>
      <Footer />
    </main>
  );
}
