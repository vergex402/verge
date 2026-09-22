// Snapshots of the live verge site for the brand brief.
// Run: node scripts/snap-brand.mjs (requires dev server on :3001)

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "..", "BRAND_BRIEF_screenshots");
await mkdir(OUT, { recursive: true });

const URL = "http://localhost:3001";
const VIEWPORT = { width: 1440, height: 900 };

// Reuse an existing Chromium binary (v1217 from clone-library install) — avoids
// re-downloading 150MB just for screenshots.
const browser = await chromium.launch({
  executablePath:
    "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
const page = await ctx.newPage();

console.log(`▸ goto ${URL}`);
await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
// Let fonts + typewriter animations land
await page.waitForTimeout(2800);

async function snap(name, scrollY = 0, opts = {}) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
  await page.waitForTimeout(800);
  const path = join(OUT, name);
  await page.screenshot({ path, type: "jpeg", quality: 90, ...opts });
  console.log(`  ✓ ${name}`);
}

// 01 — hero with cube in isometric pose (scroll 0)
await snap("01-hero.jpg", 0);

// 02 — Hero terminal mock + cube has rotated slightly
await snap("02-hero-terminal.jpg", 600);

// 03 — HowItWorks (3 step cards) + cube further rotated
await snap("03-how-it-works.jpg", 1300);

// 04 — Code SDK section
await snap("04-sdk.jpg", 2000);

// 05 — Pricing (cyan-ringed Verge card)
await snap("05-pricing.jpg", 2700);

// 06 — Why Base stats
await snap("06-why-Base.jpg", 3500);

// 07 — Waitlist
await snap("07-waitlist.jpg", 4200);

// 08 — Full-page tall capture (whole site stacked)
console.log("▸ full-page capture…");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(500);
await page.screenshot({
  path: join(OUT, "08-full-page.jpg"),
  type: "jpeg",
  quality: 82,
  fullPage: true,
});
console.log("  ✓ 08-full-page.jpg");

await browser.close();
console.log(`\n✓ ${8} screenshots → ${OUT}`);
