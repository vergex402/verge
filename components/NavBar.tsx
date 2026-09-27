"use client";

import { useState, useRef, useEffect } from "react";

const NPM_PACKAGES = [
  { name: "@vergex402/express", href: "https://www.npmjs.com/package/@vergex402/express", badge: null },
  { name: "@vergex402/hono", href: "https://www.npmjs.com/package/@vergex402/hono", badge: null },
  { name: "@vergex402/fetch", href: "https://www.npmjs.com/package/@vergex402/fetch", badge: null },
  { name: "@vergex402/ai-sdk", href: "https://www.npmjs.com/package/@vergex402/ai-sdk", badge: "NEW" },
  { name: "@vergex402/core", href: "https://www.npmjs.com/package/@vergex402/core", badge: null },
];

function NpmDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-sm font-medium text-gray-300 transition-colors hover:text-white"
      >
        npm
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 rounded-xl border border-white/[0.08] bg-[#1a1b1d] shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-3 pt-3 pb-2 font-mono text-[9px] tracking-[0.18em] text-white/30 uppercase">packages</div>
          {NPM_PACKAGES.map(pkg => (
            <a
              key={pkg.name}
              href={pkg.href}
              target="_blank"
              rel="noopener"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
            >
              <span className="flex-1 truncate">{pkg.name}</span>
              {pkg.badge && (
                <span className="rounded-full bg-emerald-400/20 border border-emerald-400/25 px-1.5 py-0.5 text-[8px] text-emerald-300 font-semibold tracking-wide">
                  {pkg.badge}
                </span>
              )}
            </a>
          ))}
          <div className="border-t border-white/[0.06] px-3 py-2.5">
            <a
              href="https://www.npmjs.com/search?q=%40vergex402"
              target="_blank"
              rel="noopener"
              onClick={() => setOpen(false)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              Browse all on npm ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:px-8 md:py-4">
      <div className="bg-[#171719] rounded-2xl shadow-lg shadow-black/20 w-auto px-4 py-2 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <img
              src="/verge-logo.jpeg"
              alt="Verge"
              className="h-7 w-7 md:h-8 md:w-8 rounded-lg"
              width={32}
              height={32}
            />
            <span className="font-[var(--font-display)] text-sm font-medium text-white md:text-base">
              verge
            </span>
          </a>

          {/* Center links */}
          <div className="hidden items-center gap-5 md:flex">
            <a href="#networks" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Networks
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Pricing
            </a>
            <a href="/docs" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Docs
            </a>
            <a href="/changelog" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Changelog
            </a>
            <a href="/trust" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Trust
            </a>
            <a
              href="https://github.com/vergex402/verge"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              GitHub
            </a>
            <NpmDropdown />
            <a
              href="https://x.com/vergesnowy402"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              Twitter
            </a>
            <a
              href="/verge"
              className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              $VERGE
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <a
              href="/app"
              className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-emerald-400"
            >
              Get access
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
