import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "..", "BRAND_BRIEF_screenshots");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});

// Desktop close-ups at extra scroll positions
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto("https://verge-mocha.vercel.app", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

const positions = [
  { name: "howitworks", y: 1300 },
  { name: "howitworks-mid", y: 1600 },
  { name: "sdk", y: 2300 },
  { name: "pricing", y: 3100 },
  { name: "why-Base", y: 4100 },
  { name: "compare", y: 4700 },
  { name: "gap1", y: 5200 },
  { name: "gap2", y: 5700 },
  { name: "waitlist-area", y: 6200 },
];
for (const p of positions) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), p.y);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `qa-desktop-x-${p.name}.jpg`), type: "jpeg", quality: 85 });
  console.log(`desktop-x-${p.name}.jpg`);
}

// Probe: report all section heights/positions
const layout = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("section, main > div").forEach((el) => {
    const r = el.getBoundingClientRect();
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 100),
      top: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
    });
  });
  return out;
});
console.log("LAYOUT:", JSON.stringify(layout, null, 2));

await browser.close();
