// Fixed-position wrapper that pins the rotating centerpiece to viewport so it
// stays visible (rotating with scroll) across the whole page.
//
// Currently using ScrollCube. To swap to ScrollCard (designer's facilitator
// card from `/public/card.jpg`), change the import below.

import ScrollCube from "@/components/ScrollCube";

export default function BackgroundCube() {
  return (
    <div
      aria-hidden
      // Heavy opacity on desktop (cube is centerpiece), much lighter on mobile
      // so it doesn't bleed-through and clash with the H1.
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-30 sm:opacity-50 md:opacity-75"
    >
      {/* Mobile: 55% so cube + orbit dots fit a ~375px viewport */}
      {/* Tablet:  75% */}
      {/* Desktop: 100% */}
      <div className="scale-[0.55] sm:scale-75 md:scale-100">
        <ScrollCube />
      </div>
    </div>
  );
}
