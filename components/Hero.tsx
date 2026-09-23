"use client";

import { useEffect, useRef } from "react";
import Reveal from "@/components/Reveal";

const WORDS = ["agent", "machine", "robot", "AI", "API"];
const tokenContract = process.env.NEXT_PUBLIC_VERGE_TOKEN_CA || "0xb73b18267d23087e3af1390edfeb8c4308921d59";
function ContractButton() {
  const hasContract = /^0x[a-fA-F0-9]{40}$/.test(tokenContract);
  const contractLabel = hasContract ? tokenContract : "Token details coming soon";
  return (
    <div className="flex flex-col items-center gap-3 pointer-events-auto">
    <div className="rounded-xl border border-white/10 bg-[#171719]/85 px-4 py-2.5 text-xs text-white/55 backdrop-blur">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">{hasContract ? "CA" : "Token"}</span>
      <span className="ml-3 break-all font-mono text-white/65">{contractLabel}</span>
    </div>
    <a
        href="https://ponsralph.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer flex items-center gap-2 bg-[#171719]/90 backdrop-blur border border-white/15 hover:border-emerald-400/50 hover:bg-[#1B1B1C] text-white px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all hover:scale-[1.03] active:scale-[0.98]"
      >
        <span className="text-emerald-400 font-bold">$VERGE</span>
        <span className="text-white/60">on</span>
        <span className="text-emerald-400 font-semibold">Pons</span>
        <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </a>
    </div>
  );
}

export default function Hero() {
  const typeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = typeRef.current;
    if (!el) return;

    let w = 0;
    let i = WORDS[0].length; // start with full first word shown
    let deleting = true;
    let timeout: ReturnType<typeof setTimeout>;

    function tick() {
      const word = WORDS[w];
      if (deleting) {
        i--;
        el!.textContent = word.slice(0, i);
        if (i <= 0) {
          deleting = false;
          w = (w + 1) % WORDS.length;
          timeout = setTimeout(tick, 350);
          return;
        }
        timeout = setTimeout(tick, 55);
      } else {
        i++;
        el!.textContent = word.slice(0, i);
        if (i >= word.length) {
          deleting = true;
          timeout = setTimeout(tick, 1600);
          return;
        }
        timeout = setTimeout(tick, 110);
      }
    }

    // wait after page load, then begin cycle
    timeout = setTimeout(() => {
      deleting = true;
      i = WORDS[0].length;
      tick();
    }, 1800);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <section className="relative min-h-screen w-screen overflow-hidden flex flex-col rounded-b-[20px] md:rounded-b-[24px] lg:rounded-b-[32px] -mb-[20px] md:-mb-[24px] lg:-mb-[32px] z-30">
      {/* Dark bg */}
      <div className="absolute inset-0 bg-[#1B1B1C]" />

      {/* Hero image with hue-shift filter to match mrdn cyan/teal */}
      <div className="absolute inset-0">
        <img
          src="/hero-fast.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{
            filter: "sepia(0.85) hue-rotate(150deg) saturate(2.4) brightness(0.95)",
          }}
          aria-hidden
        />
      </div>

      {/* Contract button — bottom center */}
      <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-full max-w-[680px] flex justify-center px-3">
        <ContractButton />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-3 md:px-5 lg:px-8 relative z-20 pt-16">
        <div className="text-center px-2 md:px-3 lg:px-6 max-w-[90%] md:max-w-none relative z-20">
          <div className="hero-ready">
            {/* Badge */}
            <div className="mb-6 md:mb-8">
              <span className="bg-emerald-500 dark:bg-emerald-400 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block font-funnel-display">
                x402
              </span>
            </div>

            {/* Line 1 */}
            <p
              className="text-lg sm:text-2xl md:text-4xl lg:text-6xl xl:text-7xl text-white font-light"
              style={{
                textShadow:
                  "0 0 6px rgba(52, 211, 153, 0.45), 0 0 14px rgba(52, 211, 153, 0.25), 0 0 24px rgba(52, 211, 153, 0.12)",
              }}
            >
              <span className="bg-emerald-500 dark:bg-emerald-400 text-black px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded font-semibold inline-block font-funnel-display">
                x402
              </span>{" "}
              payment rails
            </p>

            {/* Line 2 with typewriter */}
            <p className="text-lg sm:text-2xl md:text-4xl lg:text-6xl xl:text-7xl text-white font-light mt-1.5 md:mt-2 lg:mt-3">
              for the{" "}
              <span className="font-funnel-display font-light">
                <span ref={typeRef}>agent</span>
                <span className="animate-pulse" id="hero-cursor">|</span>
              </span>{" "}
              economy
            </p>
          </div>

        </div>
      </div>

      {/* Scroll indicator — hidden on mobile, visible on desktop */}
      <div className="hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <Reveal delay={300}>
          <div className="flex flex-col items-center gap-1.5 md:gap-2 text-white/80 hover:text-white transition-colors">
            <div className="w-5 h-8 md:w-6 md:h-10 border-2 border-white/40 rounded-full flex justify-center">
              <div className="w-0.5 h-2.5 md:w-1 md:h-3 bg-white/60 rounded-full mt-1.5 md:mt-2 animate-bounce" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
