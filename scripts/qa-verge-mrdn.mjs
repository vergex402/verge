// Full interactive QA on https://verge-mrdn.vercel.app
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const BASE = "https://verge-mrdn.vercel.app";
const PAGES = [
  { name: "Home", path: "/" },
  { name: "Docs", path: "/docs" },
  { name: "Stats", path: "/stats" },
  { name: "Auth", path: "/auth" },
  { name: "Terms", path: "/terms" },
  { name: "Privacy", path: "/privacy" },
];

const browser = await chromium.launch({
  executablePath:
    "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const report = { pages: {}, crossPage: { consoleErrors: [], networkFailures: [], brandLeaks: [] }, walletFlow: {} };

async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: "follow", method: "GET" });
    return { status: res.status, ok: res.ok, finalUrl: res.url };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

for (const pageInfo of PAGES) {
  const url = BASE + pageInfo.path;
  console.log(`\n=== ${pageInfo.name} — ${url} ===`);
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  const netFailures = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleMsgs.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("response", (resp) => {
    const s = resp.status();
    if (s >= 400) netFailures.push({ url: resp.url(), status: s });
  });

  const pageReport = {
    url,
    loadStatus: null,
    consoleErrors: [],
    pageErrors: [],
    netFailures: [],
    brandLeaks: {},
    interactiveElements: [],
    linkChecks: [],
    anchorChecks: [],
    notes: [],
  };

  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    pageReport.loadStatus = resp ? resp.status() : "no-response";
    await page.waitForTimeout(1500);
  } catch (e) {
    pageReport.notes.push(`LOAD FAILED: ${e.message}`);
    report.pages[pageInfo.name] = pageReport;
    await page.close();
    continue;
  }

  // Brand string leak audit
  const html = await page.content();
  const leaks = {
    Meridian: (html.match(/Meridian/gi) || []).length,
    MRDN: (html.match(/MRDN/g) || []).length,
    Telegram: (html.match(/Telegram/gi) || []).length,
    "t.me/": (html.match(/t\.me\//gi) || []).length,
    Aerodrome: (html.match(/Aerodrome/gi) || []).length,
  };
  pageReport.brandLeaks = leaks;

  // Enumerate interactive elements
  const elements = await page.evaluate(() => {
    const arr = [];
    document.querySelectorAll("a, button").forEach((el) => {
      arr.push({
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 80),
        href: el.getAttribute("href"),
        id: el.id || null,
        cls: el.className && typeof el.className === "string" ? el.className.slice(0, 60) : null,
      });
    });
    return arr;
  });
  pageReport.interactiveElements = elements;
  console.log(`  ${elements.length} interactive elements found`);

  // Visual sanity: stippled hands, logo
  const hands = await page.evaluate(() => ({
    left: !!document.querySelector(".verge-hands-left"),
    right: !!document.querySelector(".verge-hands-right"),
  }));
  pageReport.hands = hands;
  const logo = await page.evaluate(() => {
    const img = document.querySelector('img[src*="verge-logo"]');
    return img ? { src: img.src, alt: img.alt } : null;
  });
  pageReport.logo = logo;

  // Hero text on home only
  if (pageInfo.path === "/") {
    pageReport.heroText = await page.evaluate(() => {
      const h = document.querySelector("h1");
      return h ? h.innerText.trim() : null;
    });
  }

  // Resolve every link
  const uniqHrefs = [...new Set(elements.map((e) => e.href).filter(Boolean))];
  for (const href of uniqHrefs) {
    if (!href || href === "#" || href.startsWith("javascript:")) continue;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) {
      pageReport.linkChecks.push({ href, type: "mailto/tel", status: "skip" });
      continue;
    }
    if (href.startsWith("#")) {
      // anchor on same page
      const sel = href.replace(/^#/, "");
      const exists = await page.evaluate(
        (id) => !!document.getElementById(id) || !!document.querySelector(`[name="${id}"]`),
        sel
      );
      pageReport.anchorChecks.push({ href, exists });
      continue;
    }
    let target;
    if (href.startsWith("http")) target = href;
    else if (href.startsWith("/")) target = BASE + href;
    else target = new URL(href, url).toString();

    const r = await checkUrl(target);
    pageReport.linkChecks.push({ href, target, ...r });
  }

  // Connect Wallet button — find on home page
  if (pageInfo.path === "/") {
    page.on("dialog", async (dialog) => {
      report.walletFlow.dialogType = dialog.type();
      report.walletFlow.dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    try {
      // Try several possible selectors
      const btn = await page.$('button:has-text("Connect Wallet"), a:has-text("Connect Wallet"), button:has-text("Connect")');
      if (btn) {
        const beforeErrors = pageErrors.length;
        await btn.click({ timeout: 3000 }).catch((e) => {
          report.walletFlow.clickError = e.message;
        });
        await page.waitForTimeout(1500);
        report.walletFlow.found = true;
        report.walletFlow.afterClickPageErrors = pageErrors.slice(beforeErrors);
      } else {
        report.walletFlow.found = false;
      }
    } catch (e) {
      report.walletFlow.error = e.message;
    }
  }

  pageReport.consoleErrors = consoleMsgs;
  pageReport.pageErrors = pageErrors;
  pageReport.netFailures = netFailures;

  // Cross-page aggregation
  consoleMsgs.forEach((m) => report.crossPage.consoleErrors.push({ page: pageInfo.name, ...m }));
  pageErrors.forEach((m) => report.crossPage.consoleErrors.push({ page: pageInfo.name, type: "pageerror", text: m }));
  netFailures.forEach((f) => report.crossPage.networkFailures.push({ page: pageInfo.name, ...f }));
  Object.entries(leaks).forEach(([k, v]) => {
    if (v > 0) report.crossPage.brandLeaks.push({ page: pageInfo.name, term: k, count: v });
  });

  report.pages[pageInfo.name] = pageReport;
  await page.close();
}

await browser.close();
await writeFile("C:/Users/79150/Desktop/моча/verge-static/QA_RAW.json", JSON.stringify(report, null, 2));
console.log("\n✓ DONE — wrote QA_RAW.json");
