"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * 3D CSS cube — rotates with scroll progress.
 *
 * Implementation notes (after first iteration was laggy/glitchy):
 *  • No useSpring — adds catch-up lag; scroll-locked rotation should be rigid.
 *  • Single `transform` MotionValue string (not separate rotateX/rotateY) so that
 *    Framer doesn't break the preserve-3d child transforms.
 *  • Orbit dots use a rotating ring wrapper (radius = ring size) so the dot stays
 *    at top-center and the wrapper rotation creates the orbit. Old code used
 *    transform-origin:0 0 which orbits the top-left corner instead of the center.
 *  • will-change:transform on the rotating layer pins it on the GPU compositor.
 */

const FACE = 280;
const HALF = FACE / 2;

const ORBIT_RADII = [180, 198, 216, 234];
const ORBIT_COLORS = [
  "var(--color-cyan)",
  "var(--color-magenta)",
  "var(--color-lime)",
  "var(--color-amber)",
];

interface FaceProps {
  position: "front" | "back" | "right" | "left" | "top" | "bottom";
  color: string;
  glow: string;
  children: React.ReactNode;
}

function Face({ position, color, glow, children }: FaceProps) {
  const transform: Record<FaceProps["position"], string> = {
    front:  `translateZ(${HALF}px)`,
    back:   `translateZ(-${HALF}px) rotateY(180deg)`,
    right:  `translateX(${HALF}px) rotateY(90deg)`,
    left:   `translateX(-${HALF}px) rotateY(-90deg)`,
    top:    `translateY(-${HALF}px) rotateX(90deg)`,
    bottom: `translateY(${HALF}px) rotateX(-90deg)`,
  };
  return (
    <div
      className="absolute top-0 left-0 hud-corners"
      style={{
        width: FACE,
        height: FACE,
        transform: transform[position],
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 18%, var(--color-bg)) 0%, color-mix(in oklab, ${color} 4%, var(--color-bg)) 100%)`,
        border: `1px solid ${color}`,
        boxShadow: `0 0 28px ${glow}, inset 0 0 32px ${glow}`,
        backfaceVisibility: "visible",
      }}
    >
      <div className="absolute inset-0 grid place-items-center p-6 font-mono text-center">
        {children}
      </div>
    </div>
  );
}

export default function ScrollCube() {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll progress 0..1 over full document
  const { scrollYProgress } = useScroll();

  // Start at an isometric pose (3 faces visible: front + top + right)
  // and rotate the full ±360° on Y plus ±180° on X across page scroll.
  const transform = useTransform(
    scrollYProgress,
    (v) => `rotateX(${-25 + v * 180}deg) rotateY(${-25 + v * 540}deg)`,
  );

  return (
    <div
      ref={ref}
      className="relative mx-auto"
      style={{
        width: FACE,
        height: FACE,
        perspective: 1400,
        perspectiveOrigin: "center center",
      }}
    >
      {/* Cyan halo behind cube */}
      <div
        aria-hidden
        className="absolute inset-[-80px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 25%, transparent) 0%, transparent 60%)",
          filter: "blur(28px)",
        }}
      />

      {/* Orbit dots — each is a rotating ring (radius=r), dot sits at top-center.
          Ring rotates → dot orbits the cube center. */}
      {ORBIT_RADII.map((r, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            width: r * 2,
            height: r * 2,
            marginLeft: -r,
            marginTop: -r,
            animation: `spin-ring ${12 + i * 2}s linear infinite`,
            animationDelay: `${-i * 1.5}s`,
            willChange: "transform",
          }}
        >
          <span
            className="absolute w-2 h-2 rounded-full"
            style={{
              top: -4,
              left: "50%",
              marginLeft: -4,
              background: ORBIT_COLORS[i],
              color: ORBIT_COLORS[i],
              boxShadow: "0 0 14px currentColor, 0 0 28px currentColor",
            }}
          />
        </div>
      ))}

      {/* Rotating cube — single transform string + GPU promotion */}
      <motion.div
        className="absolute top-0 left-0"
        style={{
          width: FACE,
          height: FACE,
          transformStyle: "preserve-3d",
          transform,
          willChange: "transform",
        }}
      >
        <Face position="front" color="var(--color-amber)" glow="color-mix(in oklab, var(--color-amber) 25%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-amber mb-3 opacity-60">// step 01</div>
            <div className="text-[42px] font-bold neon-amber leading-none mb-2">402</div>
            <div className="text-[11px] tracking-[0.2em] uppercase ink-mid">Payment Required</div>
            <div className="text-[10px] mt-4 ink-dim leading-relaxed">
              GET /api/run<br/>→ x402 challenge
            </div>
          </div>
        </Face>

        <Face position="right" color="var(--color-magenta)" glow="color-mix(in oklab, var(--color-magenta) 25%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-magenta mb-3 opacity-60">// step 02</div>
            <div className="text-[42px] font-bold neon-magenta leading-none mb-2">USDG</div>
            <div className="text-[11px] tracking-[0.2em] uppercase ink-mid">Transfer + Memo</div>
            <div className="text-[10px] mt-4 ink-dim leading-relaxed">
              0.001 USDG<br/>memo: verge:8f3c2d
            </div>
          </div>
        </Face>

        <Face position="back" color="var(--color-violet)" glow="color-mix(in oklab, var(--color-violet) 30%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-violet mb-3 opacity-60">// step 03</div>
            <div className="text-[42px] font-bold neon-violet leading-none mb-2">~400ms</div>
            <div className="text-[11px] tracking-[0.2em] uppercase ink-mid">Robinhood Finality</div>
            <div className="text-[10px] mt-4 ink-dim leading-relaxed">
              tx 5K4f…3Ax<br/>confirmed
            </div>
          </div>
        </Face>

        <Face position="left" color="var(--color-lime)" glow="color-mix(in oklab, var(--color-lime) 25%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-lime mb-3 opacity-60">// step 04</div>
            <div className="text-[42px] font-bold neon-lime leading-none mb-2">200</div>
            <div className="text-[11px] tracking-[0.2em] uppercase ink-mid">OK · Unlocked</div>
            <div className="text-[10px] mt-4 ink-dim leading-relaxed">
              {"{ ok: true,"}<br/>{"  data: …}"}
            </div>
          </div>
        </Face>

        <Face position="top" color="var(--color-cyan)" glow="color-mix(in oklab, var(--color-cyan) 25%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-cyan mb-3 opacity-60">// SDK</div>
            <div className="text-[28px] font-bold neon-cyan leading-tight mb-2">@verge<br/>/express</div>
            <div className="text-[10px] mt-3 ink-dim leading-relaxed">
              app.use(paywall({"{"} 0.001 {"}"}))
            </div>
          </div>
        </Face>

        <Face position="bottom" color="var(--color-pink)" glow="color-mix(in oklab, var(--color-pink) 25%, transparent)">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-pink mb-3 opacity-60">// fee</div>
            <div className="text-[42px] font-bold leading-none mb-2" style={{ color: "var(--color-pink)", textShadow: "0 0 4px currentColor, 0 0 14px currentColor" }}>0.5%</div>
            <div className="text-[11px] tracking-[0.2em] uppercase ink-mid">vs Stripe 2.9%</div>
            <div className="text-[10px] mt-4 ink-dim leading-relaxed">
              per settled request
            </div>
          </div>
        </Face>
      </motion.div>
    </div>
  );
}
