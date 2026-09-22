// Marquee-style ticker bar above the navbar — cyberpunk neon edition.

const items = [
  "▸ 100 endpoints onboarding now",
  "▸ 0% facilitator fee · first 1M requests",
  "▸ settled in 400ms on Robinhood Chain",
  "▸ MIT licensed · self-host anytime",
  "▸ x402.org · open protocol spec",
];

const tones = [
  "var(--color-cyan)",
  "var(--color-magenta)",
  "var(--color-lime)",
  "var(--color-pink)",
  "var(--color-amber)",
];

export default function AnnouncementBar() {
  const doubled = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden border-b border-line bg-[var(--color-bg-2)]"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
      }}
    >
      <div className="ticker-track py-2">
        {doubled.map((t, i) => {
          const color = tones[i % tones.length];
          return (
            <span
              key={i}
              className="font-mono text-[11px] tracking-[0.16em] uppercase px-8 whitespace-nowrap"
              style={{
                color,
                textShadow: `0 0 6px ${color}, 0 0 14px color-mix(in oklab, ${color} 45%, transparent)`,
              }}
            >
              {t}
            </span>
          );
        })}
      </div>
    </div>
  );
}
