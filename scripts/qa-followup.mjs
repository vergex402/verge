import { chromium } from "playwright";
import fs from "fs";

const BASE = "https://verge-mocha.vercel.app";
const PW_EXEC = "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe";

const out = {};

async function main() {
  const browser = await chromium.launch({ executablePath: PW_EXEC });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors = [];
  const responses404 = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror:" + e.message));
  page.on("response", (r) => { if (r.status() >= 400) responses404.push({ url: r.url(), status: r.status() }); });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  // Look for cube, three.js, framer-motion clues
  out.cubeHunt = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    return {
      hasThreeRef: /three|webgl|gl-?canvas/i.test(html),
      hasMotionRef: /framer-motion|motion-div/i.test(html),
      transformsCount: Array.from(document.querySelectorAll("*")).filter((e) => {
        const t = getComputedStyle(e).transform;
        return t && t !== "none" && t.includes("matrix3d");
      }).length,
      perspectiveCount: Array.from(document.querySelectorAll("*")).filter((e) => getComputedStyle(e).perspective !== "none").length,
      cubeRelated: Array.from(document.querySelectorAll("*")).filter((e) =>
        /cube|hero3d|hero-3d|scene-3d/i.test(e.className?.toString() || "") ||
        /cube|hero3d/i.test(e.id || "")
      ).map((e) => ({ tag: e.tagName, cls: e.className?.toString()?.slice(0, 80), id: e.id })),
    };
  });

  // PaymentFlow exploration
  out.paymentFlow = await page.evaluate(() => {
    // search for section headings containing 'payment' or 'flow'
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4")).map((h) => h.textContent?.trim());
    const sections = Array.from(document.querySelectorAll("section")).map((s) => ({
      cls: s.className?.toString()?.slice(0, 80),
      heading: s.querySelector("h1,h2,h3,h4")?.textContent?.trim(),
      svgs: s.querySelectorAll("svg").length,
    }));
    return { headings, sections };
  });

  // Typewriter terminal
  out.typewriter = await page.evaluate(() => {
    const terms = Array.from(document.querySelectorAll("*")).filter((e) =>
      /terminal|typewriter|console|pre-?code/i.test(e.className?.toString() || "")
    ).slice(0, 5).map((e) => ({ tag: e.tagName, cls: e.className?.toString()?.slice(0, 80) }));
    const codes = document.querySelectorAll("pre, code").length;
    return { candidates: terms, preCodeCount: codes };
  });

  // Scroll and re-test FPS using performance.now over 4s
  await page.waitForTimeout(500);
  const fpsRetest = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      window.scrollTo(0, 0);
      const frames = [];
      let last = performance.now();
      let started = false;
      const start = performance.now();
      const distance = document.body.scrollHeight - window.innerHeight;
      function tick(now) {
        if (started) frames.push(now - last);
        last = now;
        started = true;
        const elapsed = now - start;
        window.scrollTo(0, distance * Math.min(1, elapsed / 4000));
        if (elapsed < 4000) requestAnimationFrame(tick);
        else {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          resolve({ avgFps: 1000 / avg, jank16: frames.filter((f) => f > 16.7).length, jank33: frames.filter((f) => f > 33).length, count: frames.length, max: Math.max(...frames), min: Math.min(...frames) });
        }
      }
      requestAnimationFrame(tick);
    });
  });
  out.fpsRetest = fpsRetest;

  // OG image actual canonical: pointing to verge.so — check what the deployed canonical/og is
  // Many Next.js builds compute the metadataBase from env. Check by fetching /opengraph-image on the deployed host.
  const r1 = await ctx.request.get(BASE + "/opengraph-image");
  out.deployedOgImage = { status: r1.status(), ct: r1.headers()["content-type"], bytes: (await r1.body()).length };

  // Check what `<link rel="icon">` resolves to on the live host
  const r2 = await ctx.request.get(BASE + "/icon");
  out.deployedIcon = { status: r2.status(), ct: r2.headers()["content-type"], bytes: (await r2.body()).length };

  out.consoleErrors = errors;
  out.networkFailures = responses404;

  await browser.close();
  fs.writeFileSync("C:/Users/79150/Desktop/моча/verge/scripts/qa-followup.json", JSON.stringify(out, null, 2));
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
