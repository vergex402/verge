"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  value: string;            // e.g. "400ms", "$0.0001", "65k TPS", "1 RPC"
  duration?: number;        // ms
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Animates the numeric portion of a string from 0 → target on viewport entry.
 * Magic-UI style. Preserves prefixes/suffixes ($, ms, k TPS, etc).
 */
export default function NumberTicker({ value, duration = 1200, className = "", style }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  // Parse once (stable across renders) — bug fix: was recomputed every render,
  // which fed into useEffect deps and caused the effect to restart every frame.
  const parsed = useMemo(() => {
    const m = value.match(/^([^\d.]*)([\d.]+)(.*)$/);
    if (!m) return null;
    const [, prefix, numStr, suffix] = m;
    return {
      prefix,
      numStr,
      suffix,
      target: parseFloat(numStr),
      decimals: numStr.includes(".") ? numStr.split(".")[1].length : 0,
    };
  }, [value]);

  // Hold the displayed string in a ref + DOM textContent (no React re-render per frame).
  // setState on every RAF was the second perf issue — 4 of these on screen = 240 renders/sec.
  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed) return;
    // Initialize to 0 (or prefix+0+suffix)
    el.textContent = `${parsed.prefix}${(0).toFixed(parsed.decimals)}${parsed.suffix}`;
  }, [parsed]);

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;
    if (started) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [parsed, started]);

  useEffect(() => {
    if (!started || !parsed) return;
    const el = ref.current;
    if (!el) return;

    const startedAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = (parsed.target * eased).toFixed(parsed.decimals);
      el.textContent = `${parsed.prefix}${current}${parsed.suffix}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, parsed, duration]);

  if (!parsed) {
    // Fallback for non-numeric values like "1 RPC" — wait, that IS parseable: "1" + " RPC".
    // The only string that wouldn't match is one without any digit at all.
    return <span ref={ref} className={className} style={style}>{value}</span>;
  }

  // Render the final value in SSR HTML so stats never appear empty before
  // hydration or when a browser delays client-side JavaScript.
  return <span ref={ref} className={className} style={style}>{value}</span>;
}
