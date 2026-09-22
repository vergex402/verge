import { chromium } from "playwright";
import fs from "fs";

const BASE = "https://verge-mocha.vercel.app";
const PW_EXEC = "C:/Users/79150/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe";

const browser = await chromium.launch({ executablePath: PW_EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });

const data = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("h1,h2,h3")).map((h) => ({
    tag: h.tagName,
    inner: h.innerHTML.slice(0, 200),
    text: h.textContent?.trim().slice(0, 200),
  }));
});

fs.writeFileSync("C:/Users/79150/Desktop/моча/verge/scripts/qa-headings.json", JSON.stringify(data, null, 2));
await browser.close();
