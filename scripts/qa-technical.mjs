import { chromium } from "playwright";
import fs from "fs";

const BASE = "https://verge-mocha.vercel.app";
const PW_EXEC = "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe";

const result = {
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  networkFailures: [],
  metaTags: {},
  performance: {},
  animations: {},
  assets: {},
  api: {},
  longTasks: [],
};

function attachListeners(page, label) {
  page.on("console", (msg) => {
    const entry = { page: label, text: msg.text(), url: msg.location().url, line: msg.location().lineNumber };
    if (msg.type() === "error") result.consoleErrors.push(entry);
    else if (msg.type() === "warning") result.consoleWarnings.push(entry);
  });
  page.on("pageerror", (err) => {
    result.pageErrors.push({ page: label, text: err.message, stack: err.stack });
  });
  page.on("response", async (resp) => {
    const status = resp.status();
    if (status >= 400) {
      result.networkFailures.push({ page: label, url: resp.url(), status, method: resp.request().method() });
    }
  });
  page.on("requestfailed", (req) => {
    result.networkFailures.push({ page: label, url: req.url(), status: "FAILED", method: req.method(), failure: req.failure()?.errorText });
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: PW_EXEC });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // ============ HOME PAGE ============
  const home = await context.newPage();
  attachListeners(home, "/");

  console.log("Visiting /...");
  const navStart = Date.now();
  const resp = await home.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const navEnd = Date.now();
  result.performance.homeNavMs = navEnd - navStart;
  result.performance.homeStatus = resp?.status();

  // Inject long-task observer
  await home.evaluate(() => {
    window.__longTasks = [];
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longTasks.push({ name: e.name, duration: e.duration, startTime: e.startTime });
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch (e) { /* no-op */ }
  });

  // Timing metrics
  const timing = await home.evaluate(() => {
    const t = performance.timing;
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    return {
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      loadEvent: t.loadEventEnd - t.navigationStart,
      firstPaint: paints.find((p) => p.name === "first-paint")?.startTime || null,
      firstContentfulPaint: paints.find((p) => p.name === "first-contentful-paint")?.startTime || null,
      transferSize: nav?.transferSize || null,
      domNodes: document.querySelectorAll("*").length,
    };
  });
  result.performance.timing = timing;

  // Meta tags
  result.metaTags = await home.evaluate(() => {
    const get = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || null;
    return {
      title: document.title,
      description: get('meta[name="description"]'),
      ogTitle: get('meta[property="og:title"]'),
      ogDescription: get('meta[property="og:description"]'),
      ogImage: get('meta[property="og:image"]'),
      ogUrl: get('meta[property="og:url"]'),
      twitterCard: get('meta[name="twitter:card"]'),
      twitterTitle: get('meta[name="twitter:title"]'),
      twitterDescription: get('meta[name="twitter:description"]'),
      twitterImage: get('meta[name="twitter:image"]'),
      canonical: get('link[rel="canonical"]', "href"),
      favicon: get('link[rel="icon"]', "href"),
    };
  });

  // Animation health - cube presence
  result.animations.cube = await home.evaluate(() => {
    const canv = document.querySelector("canvas");
    const fixed = Array.from(document.querySelectorAll("*")).find((e) => {
      const cs = getComputedStyle(e);
      return cs.position === "fixed" && (e.tagName === "CANVAS" || e.querySelector("canvas"));
    });
    return { canvasFound: !!canv, canvasCount: document.querySelectorAll("canvas").length, fixedContainer: !!fixed };
  });

  // Measure FPS during scroll
  const fpsData = await home.evaluate(async () => {
    return await new Promise((resolve) => {
      const frames = [];
      let last = performance.now();
      let scrolled = 0;
      const distance = document.body.scrollHeight - window.innerHeight;
      const duration = 4000;
      const start = performance.now();

      function tick(now) {
        frames.push(now - last);
        last = now;
        const elapsed = now - start;
        const ratio = Math.min(1, elapsed / duration);
        window.scrollTo(0, distance * ratio);
        if (elapsed < duration) requestAnimationFrame(tick);
        else {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          const fps = 1000 / avg;
          // bucket
          const jankFrames = frames.filter((f) => f > 33).length;
          resolve({ avgFps: fps, frameCount: frames.length, jankFrames, maxFrameMs: Math.max(...frames) });
        }
      }
      requestAnimationFrame(tick);
    });
  });
  result.performance.scrollFps = fpsData;

  // Memory before/after
  result.performance.memory = await home.evaluate(() => {
    const m = performance.memory;
    return m ? { usedJSHeapSize: m.usedJSHeapSize, totalJSHeapSize: m.totalJSHeapSize, limit: m.jsHeapSizeLimit } : null;
  });

  // Long tasks
  result.longTasks = await home.evaluate(() => window.__longTasks || []);

  // PaymentFlow check - look for SVG/animation
  result.animations.paymentFlow = await home.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const candidates = all.filter((e) => /payment|flow|packet|step/i.test(e.className?.toString() || "") || /payment|flow/i.test(e.id || ""));
    return {
      svgCount: document.querySelectorAll("svg").length,
      candidateCount: candidates.length,
      hasAnimateEls: document.querySelectorAll("animate, animateMotion, animateTransform").length,
    };
  });

  // ============ /docs ============
  const docs = await context.newPage();
  attachListeners(docs, "/docs");
  console.log("Visiting /docs...");
  try {
    const r = await docs.goto(BASE + "/docs", { waitUntil: "networkidle", timeout: 60000 });
    result.performance.docsStatus = r?.status();
  } catch (e) {
    result.performance.docsError = e.message;
  }

  // ============ Assets ============
  const assetPaths = [
    "/avatar.jpg",
    "/banner.jpg",
    "/logo.jpg",
    "/opengraph-image",
    "/twitter-image",
    "/icon",
  ];
  console.log("Checking assets...");
  for (const p of assetPaths) {
    try {
      const r = await context.request.get(BASE + p);
      const body = await r.body();
      result.assets[p] = { status: r.status(), contentType: r.headers()["content-type"], bytes: body.length };
    } catch (e) {
      result.assets[p] = { error: e.message };
    }
  }

  // OG image fetch (resolve)
  if (result.metaTags.ogImage) {
    try {
      const ogUrl = result.metaTags.ogImage.startsWith("http") ? result.metaTags.ogImage : BASE + result.metaTags.ogImage;
      const r = await context.request.get(ogUrl);
      const body = await r.body();
      result.assets["__og:image_resolved"] = { url: ogUrl, status: r.status(), contentType: r.headers()["content-type"], bytes: body.length };
    } catch (e) {
      result.assets["__og:image_resolved"] = { error: e.message };
    }
  }
  if (result.metaTags.twitterImage) {
    try {
      const tu = result.metaTags.twitterImage.startsWith("http") ? result.metaTags.twitterImage : BASE + result.metaTags.twitterImage;
      const r = await context.request.get(tu);
      const body = await r.body();
      result.assets["__twitter:image_resolved"] = { url: tu, status: r.status(), contentType: r.headers()["content-type"], bytes: body.length };
    } catch (e) {
      result.assets["__twitter:image_resolved"] = { error: e.message };
    }
  }

  // ============ API ============
  console.log("API smoke tests...");
  try {
    const r = await context.request.get(BASE + "/api/demo");
    const headers = r.headers();
    let body;
    try { body = await r.json(); } catch { body = await r.text(); }
    result.api.demoGet = {
      status: r.status(),
      wwwAuthenticate: headers["www-authenticate"] || null,
      contentType: headers["content-type"],
      body: typeof body === "string" ? body.slice(0, 500) : body,
    };
  } catch (e) {
    result.api.demoGet = { error: e.message };
  }

  try {
    const r = await context.request.post(BASE + "/api/waitlist", {
      data: { email: "qa@verge.so" },
      headers: { "content-type": "application/json" },
    });
    let body;
    try { body = await r.json(); } catch { body = await r.text(); }
    result.api.waitlistValid = { status: r.status(), body };
  } catch (e) {
    result.api.waitlistValid = { error: e.message };
  }

  try {
    const r = await context.request.post(BASE + "/api/waitlist", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    let body;
    try { body = await r.json(); } catch { body = await r.text(); }
    result.api.waitlistEmpty = { status: r.status(), body };
  } catch (e) {
    result.api.waitlistEmpty = { error: e.message };
  }

  await browser.close();

  fs.writeFileSync("C:/Users/79150/Desktop/моча/verge/scripts/qa-results.json", JSON.stringify(result, null, 2));
  console.log("Done. Results in scripts/qa-results.json");
}

main().catch((e) => {
  console.error("FATAL:", e);
  fs.writeFileSync("C:/Users/79150/Desktop/моча/verge/scripts/qa-results.json", JSON.stringify({ fatal: e.message, partial: result }, null, 2));
  process.exit(1);
});
