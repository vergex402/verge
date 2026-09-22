// Visual QA screenshots across mobile/tablet/desktop viewports
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "..", "BRAND_BRIEF_screenshots");
await mkdir(OUT, { recursive: true });

const URL = "https://verge-mocha.vercel.app";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({
  executablePath:
    "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});

async function captureViewport(vp) {
  console.log(`\n▸ viewport ${vp.name} (${vp.width}x${vp.height})`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Get total scroll height
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = vp.height;
  console.log(`  scrollHeight=${total}, vh=${vh}`);

  // Check for horizontal scrollbar
  const hasHorizontal = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(`  scrollWidth=${docWidth}, clientWidth=${docClientWidth}, hasHScroll=${hasHorizontal}`);

  const scrolls = [
    { label: "top", y: 0 },
    { label: "25", y: Math.floor((total - vh) * 0.25) },
    { label: "50", y: Math.floor((total - vh) * 0.5) },
    { label: "75", y: Math.floor((total - vh) * 0.75) },
    { label: "100", y: total - vh },
  ];

  for (const s of scrolls) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), s.y);
    await page.waitForTimeout(900);
    const file = join(OUT, `qa-${vp.name}-${s.label}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 85 });
    console.log(`  ✓ qa-${vp.name}-${s.label}.jpg (y=${s.y})`);
  }

  // Also grab a fullpage capture for overflow detection
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(OUT, `qa-${vp.name}-full.jpg`),
    type: "jpeg",
    quality: 75,
    fullPage: true,
  });
  console.log(`  ✓ qa-${vp.name}-full.jpg`);

  // Collect some structural info for the report
  const info = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const w = html.scrollWidth;
    const cw = html.clientWidth;
    // Find any element wider than viewport
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > cw + 1 && r.width > 0 && r.width < 5000) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 80),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    });
    // Look for touch targets (buttons / a)
    const small = [];
    document.querySelectorAll("button, a").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40)) {
        small.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim().slice(0, 30),
          h: Math.round(r.height),
          w: Math.round(r.width),
        });
      }
    });
    return {
      scrollWidth: w,
      clientWidth: cw,
      offenders: offenders.slice(0, 12),
      smallTargets: small.slice(0, 15),
      sectionCount: document.querySelectorAll("section").length,
    };
  });

  console.log(`  info=${JSON.stringify(info, null, 2)}`);

  await ctx.close();
  return info;
}

const results = {};
for (const vp of VIEWPORTS) {
  results[vp.name] = await captureViewport(vp);
}

await browser.close();
console.log("\n===== SUMMARY =====");
console.log(JSON.stringify(results, null, 2));
