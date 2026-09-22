"use client";

const items = ["Transactions", "Marketplace", "Receipts", "API Keys"] as const;

export default function MobileTabBar({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <nav className="md:hidden flex gap-1 overflow-x-auto px-4 py-3 border-b border-[#2a2a2e] bg-[#141416] sticky top-0 z-30">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={[
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
            active === item ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-gray-400 border border-transparent",
          ].join(" ")}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}
