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
    <aside className="hidden md:flex w-[264px] shrink-0 flex-col border-r border-white/[0.07] bg-[#101112] min-h-screen sticky top-0 h-screen">
      <div className="px-5 pt-6 pb-5">
        <a href="/" className="flex items-center gap-3 group">
          <img src="/verge-logo.jpeg" alt="" width={34} height={34} className="size-[34px] rounded-xl border border-white/10 object-cover" />
          <span className="flex flex-col"><span className="text-[13px] font-semibold tracking-[0.18em] text-white">VERGE</span><span className="mt-0.5 text-[10px] tracking-[0.12em] text-white/35">PAYMENT GATEWAY</span></span>
        </a>
      </div>

      <div className="mx-3 mb-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
        <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.16em] text-white/35">Workspace</span><span className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.08] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-emerald-300">7 RAILS</span></div>
        <div className="mt-2 flex items-center gap-2.5"><span className="flex size-7 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300"><AppIcon name="network" size={15}/></span><div className="min-w-0"><div className="truncate text-xs font-medium text-white/85">Verge Gateway</div><div className="mt-0.5 text-[10px] text-white/35">Multichain workspace</div></div></div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => <div key={group.title} className="mb-5">
          <div className="px-3 pb-2 text-[9px] font-semibold tracking-[0.18em] text-white/30">{group.title}</div>
          <div className="flex flex-col gap-1">{group.items.map((item) => {
            const selected = active === item.key;
            return <button key={item.key} type="button" onClick={() => onSelect(item.key)} aria-current={selected ? "page" : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-[10px] text-left text-[13px] transition-all ${selected ? "bg-emerald-300/[0.09] text-emerald-200" : "text-white/50 hover:bg-white/[0.045] hover:text-white/85"}`}>
              {selected && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-emerald-300"/>}
              <AppIcon name={item.icon} size={17} className={selected ? "text-emerald-300" : "text-white/35 group-hover:text-white/70"}/><span className="flex-1">{item.label}</span>
              {item.key === "Networks" && <span className="text-[10px] text-white/25">07</span>}
            </button>;
          })}</div>
        </div>)}
        <div className="px-3 pb-2 text-[9px] font-semibold tracking-[0.18em] text-white/30">RESOURCES</div>
        <a href="/docs" className="group flex items-center gap-3 rounded-xl px-3 py-[10px] text-[13px] text-white/50 transition-colors hover:bg-white/[0.045] hover:text-white/85"><AppIcon name="docs" size={17} className="text-white/35 group-hover:text-white/70"/>Developer docs<AppIcon name="arrow" size={13} className="ml-auto text-white/25"/></a>
        <a href="/api/catalog" target="_blank" rel="noreferrer" className="group mt-1 flex items-center gap-3 rounded-xl px-3 py-[10px] text-[13px] text-white/50 transition-colors hover:bg-white/[0.045] hover:text-white/85"><AppIcon name="arrow" size={16} className="text-white/35 group-hover:text-white/70"/>API catalog</a>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <button type="button" onClick={onOpenPalette} className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left text-xs text-white/40 transition hover:border-white/15 hover:text-white/75"><AppIcon name="search" size={15}/><span className="flex-1">Search anything</span><kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/30">⌘ K</kbd></button>
        <div className="mt-3 flex items-center gap-2 rounded-xl px-2 py-2"><span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.5)]"/><div className="min-w-0 flex-1"><div className="text-[11px] text-white/60">Robinhood Chain</div><div className="text-[10px] text-white/30">4663 · USDG</div></div>{address && <span className="font-mono text-[9px] text-white/40">{address.slice(0,5)}…{address.slice(-4)}</span>}</div>
      </div>
    </aside>
  );
}
