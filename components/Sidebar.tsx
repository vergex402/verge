"use client";

const items = [
  { key: "Transactions", label: "Transactions", icon: "◧" },
  { key: "Marketplace", label: "Marketplace", icon: "◨" },
  { key: "Receipts", label: "Receipts", icon: "▤" },
  { key: "API Keys", label: "API Keys", icon: "◆" },
] as const;

export default function Sidebar({ active, onSelect, onOpenPalette }: {
  active: string;
  onSelect: (key: string) => void;
  onOpenPalette: () => void;
}) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#2a2a2e] bg-[#141416] min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-[#2a2a2e]">
        <a href="/" className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
          <span className="font-mono text-sm tracking-[0.18em] text-white">VERGE</span>
        </a>
        <div className="text-[11px] text-gray-600 mt-2 font-mono">Robinhood Chain · 4663</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={[
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
              active === item.key
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent",
            ].join(" ")}
          >
            <span className="text-base leading-none opacity-70">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={onOpenPalette}
          className="w-full flex items-center justify-between rounded-lg border border-[#2a2a2e] bg-[#171719] px-3 py-2 text-xs text-gray-500 hover:border-emerald-500/30 hover:text-gray-300 transition-colors"
        >
          <span>Quick actions</span>
          <span className="font-mono">⌘K</span>
        </button>
      </div>

      <div className="px-5 py-4 border-t border-[#2a2a2e] text-[11px] text-gray-600 space-y-1">
        <a href="/docs" className="block hover:text-gray-400 transition-colors">Docs</a>
        <a href="/api/catalog" target="_blank" className="block hover:text-gray-400 transition-colors">API Catalog ↗</a>
      </div>
    </aside>
  );
}
