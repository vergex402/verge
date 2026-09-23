"use client";

import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
  transactions: <><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/></>,
  marketplace: <><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  receipts: <><path d="M6 3h12v18l-2.5-1.6L13 21l-3-1.6L6 21V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 7-7 3 3-2 2 2 2-3 3-2-2-2 2"/></>,
  network: <><circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></>,
  docs: <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
  wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 1 4 16.5v-10Z"/><path d="M4 7h16M16 12h4"/><circle cx="16" cy="12" r=".5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
};

export default function AppIcon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.overview}</svg>;
}
