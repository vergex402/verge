import { readFile, writeFile } from "node:fs/promises";

const data = JSON.parse(await readFile("C:/Users/79150/Desktop/моча/verge-static/QA_RAW.json", "utf8"));

let md = "# verge-mrdn.vercel.app — Full Interactive QA\n\n";

const pageNames = Object.keys(data.pages);
let totalInteractive = 0;
let totalBroken = 0;
const bugs = []; // {severity, page, desc}

for (const name of pageNames) {
  const p = data.pages[name];
  totalInteractive += (p.interactiveElements || []).length;
  for (const lc of p.linkChecks || []) {
    if (lc.status === "skip") continue;
    if (!lc.ok && lc.status !== 308 && lc.status !== 307 && lc.status !== 301 && lc.status !== 302) {
      bugs.push({ severity: "major", page: name, desc: `Link ${lc.href} → ${lc.target || ""} HTTP ${lc.status} ${lc.error || ""}` });
    }
  }
  for (const ac of p.anchorChecks || []) {
    if (!ac.exists) bugs.push({ severity: "major", page: name, desc: `Anchor ${ac.href} target missing` });
  }
  for (const ce of p.consoleErrors || []) {
    bugs.push({ severity: "minor", page: name, desc: `Console ${ce.type}: ${ce.text}` });
  }
  for (const pe of p.pageErrors || []) {
    bugs.push({ severity: "critical", page: name, desc: `Page error: ${pe}` });
  }
  for (const nf of p.netFailures || []) {
    if (nf.status === 308 || nf.status === 307) continue;
    bugs.push({ severity: nf.status >= 500 ? "critical" : "major", page: name, desc: `Network ${nf.status} ${nf.url}` });
  }
  Object.entries(p.brandLeaks || {}).forEach(([term, count]) => {
    if (count > 0) bugs.push({ severity: "major", page: name, desc: `Brand leak: "${term}" appears ${count}× in HTML` });
  });
  if (name === "Home") {
    if (!p.hands?.left || !p.hands?.right) bugs.push({ severity: "minor", page: name, desc: `Stippled hands missing: left=${p.hands?.left} right=${p.hands?.right}` });
    if (!p.logo) bugs.push({ severity: "major", page: name, desc: "verge-logo.jpg <img> not found in DOM" });
  }
}

const sev = (s) => bugs.filter((b) => b.severity === s).length;

md += `## Summary\n`;
md += `- Pages tested: ${pageNames.length}\n`;
md += `- Interactive elements enumerated: ${totalInteractive}\n`;
md += `- Bugs/issues found: ${bugs.length} (critical: ${sev("critical")}, major: ${sev("major")}, minor: ${sev("minor")})\n`;
md += `- Verdict: ${bugs.filter((b) => b.severity !== "minor").length === 0 ? "**ship**" : `fix ${bugs.filter((b) => b.severity !== "minor").length} non-minor issues before ship`}\n\n`;

md += `## Per-page findings\n\n`;

for (const name of pageNames) {
  const p = data.pages[name];
  md += `### ${name} (${p.url.replace("https://verge-mrdn.vercel.app", "")})\n`;
  md += `- Load status: HTTP ${p.loadStatus}\n`;
  md += `- Interactive elements (a/button): ${(p.interactiveElements || []).length}\n`;
  md += `- Console errors/warnings: ${(p.consoleErrors || []).length}\n`;
  md += `- Page errors (JS exceptions): ${(p.pageErrors || []).length}\n`;
  md += `- Network 4xx/5xx (excl. 308): ${(p.netFailures || []).filter((f) => f.status !== 308 && f.status !== 307).length}\n`;
  const leakStr = Object.entries(p.brandLeaks || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k}×${v}`).join(", ");
  md += `- Brand leak counts: ${leakStr || "none"}\n`;
  if (p.hands) md += `- Stippled hands: left=${p.hands.left}, right=${p.hands.right}\n`;
  if (p.logo) md += `- Verge logo: \`${p.logo.src}\` (alt=\"${p.logo.alt}\")\n`;
  if (p.heroText) md += `- Hero h1: \"${p.heroText}\"\n`;

  // Links checked
  const internalLinks = (p.linkChecks || []).filter((l) => l.target && l.target.startsWith("https://verge-mrdn.vercel.app"));
  const externalLinks = (p.linkChecks || []).filter((l) => l.target && !l.target.startsWith("https://verge-mrdn.vercel.app") && l.target.startsWith("http"));
  md += `- Links checked: ${internalLinks.length} internal, ${externalLinks.length} external\n`;
  const failedLinks = (p.linkChecks || []).filter((l) => l.status && !l.ok && l.status !== 308 && l.status !== 307 && l.status !== 301 && l.status !== 302);
  if (failedLinks.length) {
    md += `- **Failed links:**\n`;
    for (const fl of failedLinks) md += `  - ${fl.href} → ${fl.target} HTTP ${fl.status} ${fl.error || ""}\n`;
  }
  const failedAnchors = (p.anchorChecks || []).filter((a) => !a.exists);
  if (p.anchorChecks?.length) {
    md += `- Anchor links checked: ${p.anchorChecks.length}, broken: ${failedAnchors.length}\n`;
    for (const fa of failedAnchors) md += `  - **BROKEN** anchor: ${fa.href}\n`;
  }
  if (p.pageErrors?.length) {
    md += `- **Page JS errors:**\n`;
    for (const pe of p.pageErrors) md += `  - ${pe}\n`;
  }
  if (p.consoleErrors?.length) {
    md += `- Console:\n`;
    for (const ce of p.consoleErrors.slice(0, 10)) md += `  - [${ce.type}] ${ce.text}\n`;
  }
  if (p.netFailures?.length) {
    md += `- Network failures:\n`;
    for (const nf of p.netFailures.filter((f) => f.status !== 308 && f.status !== 307)) md += `  - ${nf.status} ${nf.url}\n`;
  }
  // Look for the Pons and CA buttons specifically
  const pumpLink = (p.interactiveElements || []).find((e) => e.href && /pump\.fun/i.test(e.href));
  const aeroLink = (p.interactiveElements || []).find((e) => e.href && /aerodrome/i.test(e.href));
  const caBtn = (p.interactiveElements || []).find((e) => /\bCA\b|contract address|copy ca/i.test(e.text));
  const connectBtn = (p.interactiveElements || []).find((e) => /connect wallet/i.test(e.text));
  if (pumpLink) md += `- Pons link found: \`${pumpLink.href}\`\n`;
  if (aeroLink) md += `- **AERODROME LINK STILL PRESENT:** \`${aeroLink.href}\`\n`;
  if (caBtn) md += `- CA button: text=\"${caBtn.text}\"\n`;
  if (connectBtn) md += `- Connect Wallet button: present\n`;
  md += "\n";
}

md += `## Cross-page findings\n\n`;
md += `### Console errors (all pages)\n`;
if (data.crossPage.consoleErrors.length === 0) md += `_None_\n\n`;
else {
  for (const e of data.crossPage.consoleErrors.slice(0, 30)) md += `- [${e.page}] [${e.type}] ${e.text}\n`;
  md += "\n";
}
md += `### Network failures (all pages, excl. 308 redirects)\n`;
const nf = data.crossPage.networkFailures.filter((f) => f.status !== 308 && f.status !== 307);
if (nf.length === 0) md += `_None_\n\n`;
else {
  for (const f of nf) md += `- [${f.page}] ${f.status} ${f.url}\n`;
  md += "\n";
}
md += `### Brand string leaks (Meridian / MRDN / Telegram / t.me / Aerodrome)\n`;
if (data.crossPage.brandLeaks.length === 0) md += `_None — clean rebrand_\n\n`;
else {
  for (const b of data.crossPage.brandLeaks) md += `- [${b.page}] \"${b.term}\" × ${b.count}\n`;
  md += "\n";
}

md += `## Wallet flow\n`;
const wf = data.walletFlow || {};
md += `- Connect Wallet button found: ${wf.found ? "yes" : "no"}\n`;
md += `- Click error: ${wf.clickError || "none"}\n`;
md += `- Dialog appeared: ${wf.dialogType ? `yes (${wf.dialogType})` : "no"}\n`;
md += `- Dialog message: ${wf.dialogMessage || "—"}\n`;
md += `- Page errors during click: ${wf.afterClickPageErrors?.length || 0}\n`;
if (wf.afterClickPageErrors?.length) for (const e of wf.afterClickPageErrors) md += `  - ${e}\n`;
md += "\n";

md += `## Recommendation\n`;
const critCount = sev("critical");
const majCount = sev("major");
if (critCount > 0) md += `**FIX BEFORE SHIP** — ${critCount} critical and ${majCount} major issues found.\n`;
else if (majCount > 0) md += `**REVIEW** — ${majCount} major issues to address before ship.\n`;
else md += `**SHIP** — only minor issues found.\n`;

await writeFile("C:/Users/79150/Desktop/моча/verge-static/QA_FULL.md", md);
console.log("Wrote QA_FULL.md (", md.length, "chars)");
console.log("\nBUG COUNTS: critical=", sev("critical"), "major=", sev("major"), "minor=", sev("minor"));
console.log("\nTOP BUGS:");
for (const b of bugs.slice(0, 25)) console.log(` [${b.severity}] [${b.page}] ${b.desc}`);
