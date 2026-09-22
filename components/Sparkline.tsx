"use client";

/** Tiny inline sparkline — no chart library needed. */
export default function Sparkline({ data, className = "", stroke = "#34d399" }: { data: number[]; className?: string; stroke?: string }) {
  if (data.length < 2) return <div className={className} />;

  const w = 120;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const last = data[data.length - 1];
  const lastX = w;
  const lastY = h - ((last - min) / range) * h;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={lastX} cy={lastY} r="2" fill={stroke} />
    </svg>
  );
}
