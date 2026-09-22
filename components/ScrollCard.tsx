"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * 3D rotating credit-card-style centerpiece.
 * Replaces the ScrollCube — designer-made card is a stronger brand statement
 * than 6 generic neon cube faces.
 *
 * - Single planar card with two faces (front shows the designer card image;
 *   back shows the same image mirrored + dimmed, so it still looks coherent
 *   when the back is visible during rotation)
 * - Y-axis rotation drives by full-page scroll (0..1 → 0..720°)
 * - Small X-axis tilt for parallax depth (-12° resting → +12° at full scroll)
 * - Soft hover-free perspective with neon glow halo behind
 */

const CARD_W = 520; // px
const CARD_H = 326; // 8:5 ratio matches typical card aspect

export default function ScrollCard() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();

  // One transform string for the whole card to keep preserve-3d intact
  const transform = useTransform(
    scrollYProgress,
    (v) => `rotateX(${-12 + v * 24}deg) rotateY(${v * 720}deg)`,
  );

  return (
    <div
      ref={ref}
      className="relative mx-auto"
      style={{
        width: CARD_W,
        height: CARD_H,
        perspective: 1600,
        perspectiveOrigin: "center center",
      }}
    >
      {/* Cyan-magenta dual halo behind card (matches the designer's lighting) */}
      <div
        aria-hidden
        className="absolute inset-[-120px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 25% 50%, color-mix(in oklab, var(--color-cyan) 30%, transparent) 0%, transparent 60%), radial-gradient(55% 50% at 80% 50%, color-mix(in oklab, var(--color-magenta) 28%, transparent) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      {/* Rotating layer — preserve-3d for two faces */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform,
          willChange: "transform",
        }}
      >
        {/* Front face — designer card */}
        <div
          className="absolute inset-0"
          style={{
            transform: "translateZ(2px)",
            backfaceVisibility: "hidden",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow:
              "0 0 32px color-mix(in oklab, var(--color-cyan) 30%, transparent), 0 0 48px color-mix(in oklab, var(--color-magenta) 18%, transparent)",
          }}
        >
          <img
            src="/verge-logo.jpeg"
            alt="Verge facilitator card"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Back face — same image mirrored + dimmed (so back never looks empty) */}
        <div
          className="absolute inset-0"
          style={{
            transform: "translateZ(-2px) rotateY(180deg)",
            backfaceVisibility: "hidden",
            borderRadius: 18,
            overflow: "hidden",
            opacity: 0.55,
          }}
        >
          <img
            src="/verge-logo.jpeg"
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            draggable={false}
            style={{ transform: "scaleX(-1)", filter: "saturate(0.6)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
