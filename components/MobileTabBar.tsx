"use client";

import AppIcon from "@/components/AppIcon";

const items = [
  { key: "Overview", label: "Home", icon: "overview" },
  { key: "Live Demo", label: "Demo", icon: "flash" },
  { key: "Data Feeds", label: "Feeds", icon: "network" },
  { key: "Transactions", label: "Activity", icon: "transactions" },
  { key: "Marketplace", label: "Market", icon: "marketplace" },
  { key: "Receipts", label: "Receipts", icon: "receipts" },
  { key: "Wallets", label: "Wallets", icon: "wallet" },
  { key: "Vault", label: "Vault", icon: "key" },
  { key: "Reputation", label: "Rep", icon: "network" },
  { key: "API Keys", label: "Keys", icon: "key" },
  { key: "Networks", label: "Rails", icon: "network" },
] as const;

export default function MobileTabBar({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <nav aria-label="Workspace navigation" className="md:hidden sticky top-0 z-30 border-b border-white/[0.07] bg-[#101112]/95 px-2 py-2 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {items.map((item) => {
          const selected = active === item.key;
          return <button key={item.key} type="button" onClick={() => onSelect(item.key)} aria-current={selected ? "page" : undefined}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] transition-colors ${selected ? "bg-emerald-300/10 text-emerald-200" : "text-white/40 hover:text-white/75"}`}>
            <AppIcon name={item.icon} size={16}/>{item.label}
          </button>;
        })}
      </div>
    </nav>
  );
}
