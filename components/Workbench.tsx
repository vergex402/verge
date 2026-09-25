"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppIcon from "@/components/AppIcon";

interface Line {
  id: number;
  type: "input" | "output" | "error" | "system";
  text: string;
}

let lineId = 0;

const SUGGESTIONS = [
  'inspect https://vergesnowy.com/x/',
  'inspect https://vergesnowy.com/api/health',
  'help',
];

export default function Workbench() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: lineId++, type: "system", text: "Verge Workbench — type 'help' for commands" },
  ]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const push = useCallback((type: Line["type"], text: string) => {
    setLines((prev) => [...prev, { id: lineId++, type, text }]);
  }, []);

  const run = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    push("input", `$ ${trimmed}`);
    setHistory((h) => [trimmed, ...h.slice(0, 49)]);
    setHistIdx(-1);

    if (trimmed.toLowerCase() === "clear") {
      setLines([{ id: lineId++, type: "system", text: "Verge Workbench — cleared" }]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/workbench", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();
      if (data.clear) {
        setLines([{ id: lineId++, type: "system", text: "Verge Workbench — cleared" }]);
      } else if (data.output) {
        push(data.ok ? "output" : "error", data.output);
      }
    } catch {
      push("error", "Error: could not reach workbench API.");
    } finally {
      setBusy(false);
    }
  }, [push]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    setInput("");
    if (cmd) void run(cmd);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx((i) => {
        const next = Math.min(i + 1, history.length - 1);
        setInput(history[next] ?? "");
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx((i) => {
        const next = Math.max(i - 1, -1);
        setInput(next === -1 ? "" : history[next] ?? "");
        return next;
      });
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 md:left-[264px] ${open ? "h-[340px]" : "h-[44px]"}`}>
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-t border-white/[0.08] bg-[#0c0e0d]/95 px-4 py-2.5 text-left backdrop-blur-xl transition hover:bg-[#111312]/95 md:px-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-5 items-center justify-center rounded bg-emerald-300/10">
            <AppIcon name="docs" size={12} className="text-emerald-300" />
          </span>
          <span className="font-mono text-[11px] text-white/60">Workbench</span>
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-white/30">BETA</span>
          {!open && <span className="text-[10px] text-white/25 italic">inspect &lt;url&gt; · curl &lt;url&gt; · help</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full transition-colors ${busy ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,.5)]" : "bg-emerald-300/50"}`} />
          <AppIcon name="arrow" size={13} className={`text-white/30 transition-transform duration-200 ${open ? "rotate-90" : "-rotate-90"}`} />
        </div>
      </button>

      {/* Terminal body */}
      {open && (
        <div className="flex h-[296px] flex-col border-t border-white/[0.06] bg-[#080a09]/97 backdrop-blur-xl">
          {/* Output */}
          <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6">
            {lines.map((line) => (
              <pre
                key={line.id}
                className={`whitespace-pre-wrap break-all font-mono text-[11px] leading-5 ${
                  line.type === "input" ? "text-emerald-300" :
                  line.type === "error" ? "text-rose-300" :
                  line.type === "system" ? "text-white/30 italic" :
                  "text-white/70"
                }`}
              >
                {line.text}
              </pre>
            ))}
            {busy && (
              <span className="font-mono text-[11px] text-white/30 animate-pulse">running…</span>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {lines.length <= 2 && !busy && (
            <div className="flex flex-wrap gap-2 border-t border-white/[0.05] px-4 py-2 md:px-6">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="rounded border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-white/40 transition hover:border-emerald-300/20 hover:text-emerald-300/70"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2 md:px-6">
            <span className="font-mono text-[12px] text-emerald-300 shrink-0">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              placeholder="inspect <url> · curl <url> · help"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent font-mono text-[12px] text-white/85 placeholder:text-white/20 outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 rounded border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] text-white/40 transition hover:border-emerald-300/20 hover:text-emerald-300 disabled:opacity-30"
            >
              run
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
