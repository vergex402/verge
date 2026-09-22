"use client";

import { useEffect, useRef, useState } from "react";

interface Command {
  id: string;
  label: string;
  hint?: string;
  action: () => void;
}

export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(""); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[#2a2a2e] bg-[#171719] shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-[#2a2a2e]">
          <span className="text-gray-500 text-sm font-mono">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-gray-600"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-sm text-gray-600">No commands found.</div>}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { c.action(); setOpen(false); }}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <span>{c.label}</span>
              {c.hint && <span className="text-xs font-mono text-gray-600">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
