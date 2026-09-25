import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Verge — $VERGE Token",
  description: "The $VERGE token: fee discounts, tiers, and protocol utility for the Verge HTTP 402 gateway.",
};

const TIERS = [
  { name: "Free", verge: "0", fee: "0.5%", color: "text-white/40", border: "border-white/[0.07]", bg: "bg-white/[0.02]", badge: "" },
  { name: "Builder", verge: "10,000", fee: "0.35%", color: "text-emerald-200/70", border: "border-emerald-200/15", bg: "bg-emerald-200/[0.04]", badge: "–30%" },
  { name: "Pro", verge: "50,000", fee: "0.20%", color: "text-emerald-300", border: "border-emerald-300/20", bg: "bg-emerald-300/[0.06]", badge: "–60%" },
  { name: "Partner", verge: "250,000", fee: "0.00%", color: "text-white", border: "border-white/15", bg: "bg-white/[0.05]", badge: "Zero fee" },
] as const;

const DOES: string[] = [
  "Steps down the 0.5% protocol fee on every settled payment as your tier increases.",
  "Unlocks higher marketplace endpoint quotas at Builder tier and above.",
  "Revenue-funded buybacks: a share of protocol fees buys $VERGE on the open market.",
  "Signals builder commitment — balance is checked live at each settlement, nothing is locked or staked.",
];

const DOESNT: string[] = [
  "No gate on the product. Every Verge feature works at 0 $VERGE; tiers only discount fees.",
  "No staking, no lock-ups, no emissions. Yield comes from your settled USDG, not token inflation.",
  "No governance claim and no revenue share. Buybacks are discretionary, funded by real protocol revenue.",
  "Not a security. $VERGE is not a deposit, a bond, or a promise of return.",
];

const CA = "0xb73b18267d23087e3af1390edfeb8c4308921d59";
const PONS_URL = `https://www.ponsfamily.com/launchpad/${CA}`;
const EXPLORER_URL = `https://robinhoodchain.blockscout.com/token/${CA}`;

export default function VergePage() {
  return (
    <main className="bg-[#171719] min-h-screen">
      <NavBar />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-5 pt-28 pb-16 md:pt-36 md:pb-20">
        <span className="inline-block rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-300 mb-6">
          $VERGE · Robinhood Chain 4663
        </span>
        <h1 className="font-[var(--font-display)] text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-[72px]">
          The fee token.<br/>
          <span className="text-emerald-300">Not the product.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-7 text-white/55 md:text-[19px]">
          Hold $VERGE to step down Verge's 0.5% settlement fee — all the way to zero at Partner tier. No staking. No lock-ups. Checked live at each settlement.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={PONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Get $VERGE on Pons →
          </a>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Explorer ↗
          </a>
          <a href="/app" className="btn btn-ghost">Open gateway</a>
        </div>
      </section>

      {/* ── Contract ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1c1b] p-5 md:p-7">
          <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Contract</div>
          <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Ticker", "$VERGE"],
              ["Chain", "Robinhood Chain (4663)"],
              ["Standard", "ERC-20, fixed supply"],
              ["Decimals", "18"],
              ["Launch venue", "Pons bonding curve"],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-[10px] text-white/30">{label}</div>
                <div className="mt-1 font-medium text-white/80">{val}</div>
              </div>
            ))}
            <div>
              <div className="text-[10px] text-white/30">Contract address</div>
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all font-mono text-[11px] text-emerald-300 hover:text-emerald-200"
              >
                {CA}
              </a>
            </div>
          </div>
          <p className="mt-5 rounded-xl border border-amber-200/10 bg-amber-100/[0.03] px-4 py-3 text-[11px] leading-5 text-amber-100/70">
            The only $VERGE contract is the address above. Any other address, presale, or pool claiming to be $VERGE is not ours.
          </p>
        </div>
      </section>

      {/* ── Tiers ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="mb-6">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Fee tiers</div>
          <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Hold more, pay less.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
            Tier is checked live at each settlement — the $VERGE balance in your wallet at the moment of payment determines the fee. Nothing is locked. Sell the token and your tier drops.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border ${tier.border} ${tier.bg} p-5`}
            >
              {tier.badge && (
                <span className="absolute right-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-300">
                  {tier.badge}
                </span>
              )}
              <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tier.color}`}>
                {tier.name}
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {tier.fee}
              </div>
              <div className="mt-1 text-[10px] text-white/30">protocol fee</div>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <div className="text-[10px] text-white/30">Requires</div>
                <div className="mt-1 text-sm font-medium text-white/75">
                  {tier.verge === "0" ? "No $VERGE" : `${tier.verge} $VERGE`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-white/30">
          Thresholds are fixed at launch. Balance is read on-chain at settlement time — no registration or staking needed.
        </p>
      </section>

      {/* ── What it does / doesn't ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200/10 bg-emerald-200/[0.03] p-5 md:p-7">
            <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/60">What it does</div>
            <ul className="space-y-3">
              {DOES.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-white/60">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-[9px] text-emerald-300">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 md:p-7">
            <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">What it doesn't do</div>
            <ul className="space-y-3">
              {DOESNT.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-white/50">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/10 text-[9px] text-white/30">×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Revenue loop ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1c1b] p-5 md:p-8">
          <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Revenue loop</div>
          <h3 className="text-xl font-semibold text-white">The token follows the revenue.</h3>
          <p className="mt-3 text-sm leading-7 text-white/50">
            Verge's revenue is protocol fees on settled payments first, marketplace volume second. A share of that revenue funds market buybacks of $VERGE — paid for by real product usage, not by inflation. The product ships first; the token follows the revenue.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Agents pay fees", "Every x402 settlement through Verge's facilitator carries a 0.5% protocol fee (less for tier holders)."],
              ["Revenue is real", "Fee revenue starts from day one. No token inflation, no emissions, no points-to-token conversion."],
              ["Buybacks are discretionary", "A portion of fee revenue buys $VERGE on the open market. Not a promise of return — a product-funded mechanism."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs font-semibold text-white/80">{title}</div>
                <p className="mt-2 text-[11px] leading-5 text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-5 pb-24 text-center">
        <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[0.04] px-6 py-14">
          <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/60">Get started</div>
          <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Buy $VERGE. Pay less. Build more.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/45">
            Available on the Pons bonding curve on Robinhood Chain. Connect a wallet, buy $VERGE, and your gateway fee steps down automatically on the next settlement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={PONS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Buy on Pons →
            </a>
            <a href="/app" className="btn btn-ghost">Open gateway</a>
            <a href="/docs" className="btn btn-ghost">Read the docs</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
