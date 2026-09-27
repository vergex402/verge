"use client";

import AppIcon from "@/components/AppIcon";

const groups = [
  { title: "WORKSPACE", items: [
    { key: "Overview", label: "Overview", icon: "overview" },
    { key: "Live Demo", label: "Live demo", icon: "flash" },
    { key: "Data Feeds", label: "Data feeds", icon: "network" },
    { key: "Transactions", label: "Transactions", icon: "transactions" },
    { key: "Marketplace", label: "Marketplace", icon: "marketplace" },
    { key: "Receipts", label: "Receipts", icon: "receipts" },
    { key: "Invoices", label: "Invoices", icon: "receipts" },
  ]},
  { title: "AGENTS", items: [
    { key: "Wallets", label: "Agent wallets", icon: "wallet" },
    { key: "Vault", label: "Credential vault", icon: "key" },
    { key: "Reputation", label: "Reputation", icon: "network" },
  ]},
  { title: "REVENUE", items: [
    { key: "Splits", label: "Revenue splits", icon: "network" },
  ]},
  { title: "DEVELOPER", items: [
    { key: "API Keys", label: "API keys", icon: "key" },
    { key: "Webhooks", label: "Webhooks", icon: "network" },
    { key: "Domains", label: "Custom domains", icon: "network" },
    { key: "Networks", label: "Payment rails", icon: "network" },
    { key: "Sandbox", label: "Sandbox mode", icon: "flash" },
  ]},
] as const;

export default function Sidebar({ active, onSelect, onOpenPalette, address }: {
  active: string;
  onSelect: (key: string) => void;
  onOpenPalette: () => void;
  address?: string;
}) {
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0d0e10] sticky top-0 h-screen overflow-hidden">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <a href="/" className="flex items-center gap-2.5 group">
          <img src="/verge-logo.jpeg" alt="" width={30} height={30} className="size-[30px] rounded-lg border border-white/10 object-cover" />
          <span className="flex flex-col">
            <span className="text-[12px] font-semibold tracking-[0.2em] text-white">VERGE</span>
            <span className="text-[9px] tracking-[0.14em] text-white/30">PAYMENT GATEWAY</span>
          </span>
        </a>
      </div>

      {/* Workspace badge */}
      <div className="mx-3 mb-3 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.16em] text-white/30">Workspace</span>
          <span className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.08] px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-emerald-300">7 RAILS</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
            <AppIcon name="network" size={13}/>
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-white/80">Verge Gateway</div>
            <div className="text-[9px] text-white/30">Multichain · USDG</div>
          </div>
        </div>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            <div className="px-2 pb-1 text-[8.5px] font-semibold tracking-[0.2em] text-white/25">{group.title}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const selected = active === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelect(item.key)}
                    aria-current={selected ? "page" : undefined}
                    className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] transition-all ${
                      selected
                        ? "bg-emerald-300/[0.09] text-emerald-200"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    {selected && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-emerald-300"/>}
                    <AppIcon
                      name={item.icon}
                      size={15}
                      className={selected ? "text-emerald-300" : "text-white/30 group-hover:text-white/60"}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.key === "Networks" && <span className="text-[9px] text-white/20">07</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Resources */}
        <div className="mb-1 px-2 pb-1 text-[8.5px] font-semibold tracking-[0.2em] text-white/25">RESOURCES</div>
        <a href="/docs" className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80">
          <AppIcon name="docs" size={15} className="text-white/30 group-hover:text-white/60"/>
          <span className="flex-1">Developer docs</span>
          <AppIcon name="arrow" size={11} className="text-white/20"/>
        </a>
        <a href="/api/catalog" target="_blank" rel="noreferrer" className="group mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80">
          <AppIcon name="arrow" size={14} className="text-white/30 group-hover:text-white/60"/>
          <span>API catalog</span>
        </a>
        <a href="/changelog" className="group mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80">
          <AppIcon name="receipts" size={15} className="text-white/30 group-hover:text-white/60"/>
          <span>Changelog</span>
        </a>
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-white/[0.06] px-2 py-2.5">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-left text-[11px] text-white/35 transition hover:border-white/12 hover:text-white/60"
        >
          <AppIcon name="search" size={13}/>
          <span className="flex-1">Search anything</span>
          <kbd className="rounded border border-white/10 px-1 py-0.5 font-mono text-[8px] text-white/25">⌘K</kbd>
        </button>
        <div className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.6)]"/>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/50">Robinhood Chain</div>
            <div className="text-[9px] text-white/25">4663 · USDG</div>
          </div>
          {address && <span className="font-mono text-[9px] text-white/30">{address.slice(0,5)}…{address.slice(-4)}</span>}
        </div>
      </div>
    </aside>
  );
}
