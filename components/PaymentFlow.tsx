"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

/**
 * Live x402 payment flow.
 *
 * Desktop (≥md): 3 nodes in a triangle (Agent / API / Robinhood) connected by
 *   SVG lines, animated packet travels along the active edge.
 *
 * Mobile (<md):  3 nodes stacked vertically with arrow connectors.
 *   Active arrow lights up with the step's tone color, step label floats
 *   next to the active arrow.
 *
 * Both share the same 6-step state machine and step counter.
 */

type NodeKey = "agent" | "api" | "Robinhood";

interface Step {
  from: NodeKey;
  to: NodeKey;
  label: string;
  tone: "cyan" | "amber" | "magenta" | "violet" | "lime";
  ms: number;
}

const STEPS: Step[] = [
  { from: "agent",  to: "api",    label: "GET /api/run",            tone: "cyan",    ms: 1100 },
  { from: "api",    to: "agent",  label: "402 PAYMENT REQUIRED",    tone: "amber",   ms: 1100 },
  { from: "agent",  to: "Robinhood", label: "pay 0.001 USDG",          tone: "magenta", ms: 1100 },
  { from: "Robinhood", to: "agent", label: "tx 5K4f…3Ax · 400ms",     tone: "violet",  ms: 900  },
  { from: "agent",  to: "api",    label: "GET /api/run + X-Pay-Tx", tone: "cyan",    ms: 900  },
  { from: "api",    to: "agent",  label: "200 OK · {data}",         tone: "lime",    ms: 1100 },
];

const TONE: Record<Step["tone"], string> = {
  cyan:    "var(--color-cyan)",
  amber:   "var(--color-amber)",
  magenta: "var(--color-magenta)",
  violet:  "var(--color-violet)",
  lime:    "var(--color-lime)",
};

const NODE_META: Record<NodeKey, { label: string; sub: string; color: string }> = {
  agent:  { label: "AGENT",  sub: "your operator", color: "var(--color-cyan)"    },
  api:    { label: "API",    sub: "paid endpoint", color: "var(--color-magenta)" },
  Robinhood: { label: "Robinhood", sub: "settlement",    color: "var(--color-violet)"  },
};

// Triangle coords (SVG viewBox 880×500) — desktop only
const NODES_XY: Record<NodeKey, { x: number; y: number }> = {
  agent:  { x: 130, y: 250 },
  api:    { x: 740, y: 90  },
  Robinhood: { x: 740, y: 410 },
};

export default function PaymentFlow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];

  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % STEPS.length), step.ms + 150);
    return () => clearTimeout(t);
  }, [idx, step.ms]);

  const isActive = (key: NodeKey) => key === step.from || key === step.to;
  const toneColor = TONE[step.tone];

  return (
    <section className="section-dark py-24 md:py-32 border-t border-line relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 relative">
        <div className="max-w-[680px] mb-10 md:mb-12">
          <span className="tag-402 mb-5 inline-flex">▸ LIVE FLOW · WATCH IT HAPPEN</span>
          <h2 className="font-display text-[clamp(28px,6vw,56px)] font-bold tracking-[-0.03em] leading-[1.05] ink mb-5 mt-5">
            One request.
            <br />
            <span className="neon-cyan">Settled in 400ms.</span>
          </h2>
          <p className="ink-mid text-[15px] md:text-[17px] leading-[1.55]">
            What actually happens when an agent calls a Verge-protected endpoint.
            <span className="ink-dim"> 6 steps, ~6 seconds, on-chain.</span>
          </p>
        </div>

        {/* ── DESKTOP triangle (≥md) ────────────────────────────────────── */}
        <DesktopFlow step={step} idx={idx} toneColor={toneColor} isActive={isActive} />

        {/* ── MOBILE vertical stack (<md) ───────────────────────────────── */}
        <MobileFlow step={step} idx={idx} toneColor={toneColor} isActive={isActive} />

        {/* Step counter */}
        <div className="max-w-[880px] mx-auto mt-8 md:mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 24 : 10,
                  background:
                    i === idx
                      ? TONE[s.tone]
                      : i < idx
                        ? "color-mix(in oklab, var(--color-cyan) 35%, transparent)"
                        : "var(--color-line-bright)",
                  boxShadow: i === idx ? `0 0 8px ${TONE[s.tone]}` : "none",
                }}
              />
            ))}
          </div>
          <div className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] ink-dim uppercase whitespace-nowrap shrink-0">
            step {String(idx + 1).padStart(2, "0")} / 06 · loop
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* DESKTOP TRIANGLE                                                       */
/* ────────────────────────────────────────────────────────────────────── */

interface FlowProps {
  step: Step;
  idx: number;
  toneColor: string;
  isActive: (k: NodeKey) => boolean;
}

function DesktopFlow({ step, idx, toneColor, isActive }: FlowProps) {
  const fromNode = NODES_XY[step.from];
  const toNode = NODES_XY[step.to];

  return (
    <div
      className="hidden md:block relative mx-auto w-full max-w-[880px]"
      style={{ aspectRatio: "880 / 500" }}
    >
      <svg
        viewBox="0 0 880 500"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="pf-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Triangle backbone — 3 dashed lines */}
        <line x1={NODES_XY.agent.x}  y1={NODES_XY.agent.y}  x2={NODES_XY.api.x}    y2={NODES_XY.api.y}    stroke="var(--color-line-bright)" strokeOpacity="0.4"  strokeDasharray="3 8" />
        <line x1={NODES_XY.agent.x}  y1={NODES_XY.agent.y}  x2={NODES_XY.Robinhood.x} y2={NODES_XY.Robinhood.y} stroke="var(--color-line-bright)" strokeOpacity="0.4"  strokeDasharray="3 8" />
        <line x1={NODES_XY.api.x}    y1={NODES_XY.api.y}    x2={NODES_XY.Robinhood.x} y2={NODES_XY.Robinhood.y} stroke="var(--color-line-bright)" strokeOpacity="0.15" strokeDasharray="3 8" />

        {/* Active edge */}
        <motion.line
          key={idx}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={toneColor}
          strokeWidth="2"
          strokeOpacity="0"
          filter="url(#pf-glow)"
          animate={{ strokeOpacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: step.ms / 1000, times: [0, 0.2, 0.85, 1] }}
        />

        {/* Packet */}
        <motion.circle
          key={`packet-${idx}`}
          r="9"
          fill={toneColor}
          filter="url(#pf-glow)"
          initial={{ cx: fromNode.x, cy: fromNode.y, opacity: 0 }}
          animate={{
            cx: [fromNode.x, toNode.x],
            cy: [fromNode.y, toNode.y],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: step.ms / 1000, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
        />
      </svg>

      {/* Node cards */}
      {(["agent", "api", "Robinhood"] as NodeKey[]).map((key) => {
        const meta = NODE_META[key];
        const pos = NODES_XY[key];
        const active = isActive(key);
        return (
          <div
            key={key}
            className="absolute hud-corners"
            style={{
              left:  `${(pos.x / 880) * 100}%`,
              top:   `${(pos.y / 500) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: 168,
              padding: "12px 14px",
              borderRadius: 8,
              background: active
                ? `linear-gradient(180deg, color-mix(in oklab, ${meta.color} 16%, var(--color-bg-card)) 0%, var(--color-bg-card) 100%)`
                : "var(--color-bg-card)",
              border: `1px solid ${active ? meta.color : "var(--color-line-bright)"}`,
              boxShadow: active
                ? `0 0 24px color-mix(in oklab, ${meta.color} 35%, transparent), inset 0 0 16px color-mix(in oklab, ${meta.color} 10%, transparent)`
                : "0 0 0 1px rgba(0,0,0,0.4)",
              transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
              zIndex: 2,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-mono text-[10px] tracking-[0.22em] font-semibold"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
              {active && (
                <span
                  className="pulse-dot w-1.5 h-1.5 rounded-full"
                  style={{ color: meta.color, background: meta.color }}
                />
              )}
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] ink-dim">
              {meta.sub}
            </div>
          </div>
        );
      })}

      {/* Floating step label */}
      <motion.div
        key={`label-${idx}`}
        className="absolute pointer-events-none"
        style={{
          left: `${((NODES_XY[step.from].x + NODES_XY[step.to].x) / 2 / 880) * 100}%`,
          top:  `${((NODES_XY[step.from].y + NODES_XY[step.to].y) / 2 / 500) * 100}%`,
          transform: "translate(-50%, -50%)",
          zIndex: 3,
        }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -6] }}
        transition={{ duration: step.ms / 1000, times: [0, 0.2, 0.8, 1] }}
      >
        <div
          className="font-mono text-[11px] tracking-[0.12em] px-3 py-1.5 rounded whitespace-nowrap"
          style={{
            color: toneColor,
            background: `color-mix(in oklab, ${toneColor} 12%, var(--color-bg-card))`,
            border: `1px solid ${toneColor}`,
            boxShadow: `0 0 16px color-mix(in oklab, ${toneColor} 30%, transparent)`,
          }}
        >
          {step.label}
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* MOBILE VERTICAL STACK                                                  */
/* ────────────────────────────────────────────────────────────────────── */

function MobileFlow({ step, idx, toneColor, isActive }: FlowProps) {
  // Vertical order: AGENT — API — Robinhood
  // Arrow positions: between AGENT↔API (top arrow), between API↔Robinhood (bottom arrow)
  // The middle "AGENT ↔ Robinhood" pair on triangle becomes "skip-the-middle" on mobile.
  // We render label always under the active step.

  const ORDER: NodeKey[] = ["agent", "api", "Robinhood"];

  // Direction of the current step's "flow arrow" in the vertical stack
  const fromIdx = ORDER.indexOf(step.from);
  const toIdx = ORDER.indexOf(step.to);
  const direction = toIdx > fromIdx ? "down" : "up";

  return (
    <div className="md:hidden relative mx-auto w-full max-w-[420px]">
      <div className="flex flex-col gap-3">
        {ORDER.map((key, i) => {
          const meta = NODE_META[key];
          const active = isActive(key);
          return (
            <div key={key}>
              {/* Node card */}
              <div
                className="hud-corners"
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: active
                    ? `linear-gradient(180deg, color-mix(in oklab, ${meta.color} 18%, var(--color-bg-card)) 0%, var(--color-bg-card) 100%)`
                    : "var(--color-bg-card)",
                  border: `1px solid ${active ? meta.color : "var(--color-line-bright)"}`,
                  boxShadow: active
                    ? `0 0 22px color-mix(in oklab, ${meta.color} 35%, transparent), inset 0 0 14px color-mix(in oklab, ${meta.color} 10%, transparent)`
                    : "0 0 0 1px rgba(0,0,0,0.4)",
                  transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-mono text-[10px] tracking-[0.22em] font-semibold"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {active && (
                    <span
                      className="pulse-dot w-1.5 h-1.5 rounded-full"
                      style={{ color: meta.color, background: meta.color }}
                    />
                  )}
                </div>
                <div className="font-mono text-[10px] tracking-[0.1em] ink-dim">
                  {meta.sub}
                </div>
              </div>

              {/* Connector arrow + step label between this card and the next */}
              {i < ORDER.length - 1 && (
                <Connector
                  fromKey={key}
                  toKey={ORDER[i + 1]}
                  active={
                    (step.from === key && step.to === ORDER[i + 1]) ||
                    (step.from === ORDER[i + 1] && step.to === key)
                  }
                  flowDirection={direction}
                  step={step}
                  toneColor={toneColor}
                  idx={idx}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* "Long-arc" indicator for AGENT ↔ Robinhood (when step skips API) */}
      {(step.from === "agent" && step.to === "Robinhood") ||
      (step.from === "Robinhood" && step.to === "agent") ? (
        <div
          key={`longarc-${idx}`}
          className="absolute right-[-12px] top-[60px] bottom-[60px] flex flex-col items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: step.ms / 1000, times: [0, 0.2, 0.8, 1] }}
            className="font-mono text-[10px] tracking-[0.14em] px-2 py-1 rounded whitespace-nowrap"
            style={{
              color: toneColor,
              background: `color-mix(in oklab, ${toneColor} 14%, var(--color-bg-card))`,
              border: `1px solid ${toneColor}`,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: step.from === "Robinhood" ? "rotate(180deg)" : "none",
            }}
          >
            {step.label}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function Connector({
  fromKey,
  toKey,
  active,
  flowDirection,
  step,
  toneColor,
  idx,
}: {
  fromKey: NodeKey;
  toKey: NodeKey;
  active: boolean;
  flowDirection: "up" | "down";
  step: Step;
  toneColor: string;
  idx: number;
}) {
  return (
    <div className="relative h-12 flex items-center justify-center my-1">
      {/* Static dashed connector */}
      <div
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--color-line-bright) 0 4px, transparent 4px 10px)",
          opacity: 0.5,
        }}
      />

      {active && (
        <>
          {/* Active glowing line + traveling dot */}
          <motion.div
            key={`line-${idx}`}
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px]"
            style={{
              background: toneColor,
              boxShadow: `0 0 8px ${toneColor}`,
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scaleY: [0.3, 1, 1, 0.3] }}
            transition={{ duration: step.ms / 1000, times: [0, 0.2, 0.8, 1] }}
          />
          <motion.div
            key={`dot-${idx}`}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: toneColor,
              boxShadow: `0 0 12px ${toneColor}`,
              left: "50%",
              marginLeft: -6,
            }}
            initial={{ opacity: 0, top: flowDirection === "down" ? 0 : "calc(100% - 12px)" }}
            animate={{
              opacity: [0, 1, 1, 0],
              top: flowDirection === "down"
                ? [0, "calc(100% - 12px)"]
                : ["calc(100% - 12px)", 0],
            }}
            transition={{ duration: step.ms / 1000, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
          />
          {/* Label to the right of the connector */}
          <motion.div
            key={`label-${idx}`}
            className="absolute font-mono text-[10px] tracking-[0.12em] px-2 py-1 rounded whitespace-nowrap pointer-events-none"
            style={{
              color: toneColor,
              background: `color-mix(in oklab, ${toneColor} 14%, var(--color-bg-card))`,
              border: `1px solid ${toneColor}`,
              left: "calc(50% + 12px)",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
            }}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-4, 0, 0, 4] }}
            transition={{ duration: step.ms / 1000, times: [0, 0.2, 0.8, 1] }}
          >
            {step.label}
          </motion.div>
        </>
      )}
    </div>
  );
}
