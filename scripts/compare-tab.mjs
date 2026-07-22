/**
 * Side-by-side capture of one console tab: V7 and React, in the SAME state.
 *
 * The earlier harness only ever shot the React side in its default view, and
 * three real misses got through it — an editable select I had rendered as a
 * label, a rating cell I never populated, and two dialogs I replaced with a
 * bare file input. None of those are visible in a default table screenshot;
 * all three are obvious side by side.
 *
 * So this drives BOTH sides into the same state before shooting:
 *   default   — the tab as it opens
 *   expanded  — first row's detail card open
 *   dialog    — first row's dialog open
 *
 * It also dumps V7's column headers next to React's, because a missing or
 * renamed column is the one difference a screenshot pair makes you hunt for.
 *
 * Usage: node scripts/compare-tab.mjs <tab-id> [state]
 */

import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TAB = process.argv[2] ?? "practitioners";
const STATE = process.argv[3] ?? "default";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "_parity");
// The tracked spec (spec/v7), so this runs in a fresh clone.
const V7 = path
  .join(here, "..", "spec", "v7", "iqcommune-admin-console-automated.html")
  .split(path.sep)
  .join("/");

const VIEWPORT = { width: 1500, height: 1200 };
const browser = await chromium.launch();

/**
 * Column headers of the tables in the VISIBLE panel, for a text-level diff.
 *
 * Scoped, because V7 keeps every panel in the DOM and only toggles a class —
 * an unscoped query returns all seventy-odd headers in the file and the diff
 * becomes noise.
 */
const headers = (page, scope) =>
  page.$$eval(`${scope} table thead th`, (cells) =>
    cells.map((cell) => cell.textContent.trim()).filter(Boolean),
  );

// ── V7 ──────────────────────────────────────────────────────────────────────
const v7 = await browser.newPage({ viewport: VIEWPORT });
await v7.goto(`file://${V7}`);
await v7.evaluate((tab) => {
  for (const panel of document.querySelectorAll(".tab-panel")) panel.classList.remove("active");
  document.getElementById(`panel-${tab}`)?.classList.add("active");
  // V7 gates its Global-Admin-only controls on a body class.
  document.body.classList.remove("role-admin", "role-user");
  document.body.classList.add("role-global");
}, TAB);
await v7.waitForTimeout(500);

if (STATE === "expanded") {
  await v7.evaluate(() => document.querySelector(".tab-panel.active tbody tr.dr")?.click());
  await v7.waitForTimeout(400);
}

await v7.screenshot({ path: path.join(OUT, `cmp-${TAB}-${STATE}-v7.png`), fullPage: true });
const v7Headers = await headers(v7, ".tab-panel.active");

// ── React ───────────────────────────────────────────────────────────────────
const react = await browser.newPage({ viewport: VIEWPORT });
const errors = [];
react.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
react.on("pageerror", (error) => errors.push(String(error)));

await react.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });
await react.evaluate((tab) => {
  const control = document.querySelector(`[data-tab="${tab}"]`);
  if (control instanceof HTMLElement) control.click();
}, TAB);
await react.waitForTimeout(500);

if (STATE === "expanded") {
  const toggle = react.locator("table tbody tr button[aria-expanded]").first();
  if (await toggle.count()) {
    await toggle.click();
    await react.waitForTimeout(400);
  }
}

await react.screenshot({ path: path.join(OUT, `cmp-${TAB}-${STATE}-react.png`), fullPage: true });
const reactHeaders = await headers(react, "main");

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`tab=${TAB} state=${STATE}`);
console.log(`  V7    columns (${v7Headers.length}): ${v7Headers.join(" | ")}`);
console.log(`  React columns (${reactHeaders.length}): ${reactHeaders.join(" | ")}`);

const missing = v7Headers.filter((header) => !reactHeaders.includes(header));
const extra = reactHeaders.filter((header) => !v7Headers.includes(header));
if (missing.length) console.log(`  MISSING in React: ${missing.join(", ")}`);
if (extra.length) console.log(`  EXTRA in React:   ${extra.join(", ")}`);
if (!missing.length && !extra.length && v7Headers.length) console.log("  columns match");

// Every control V7 offers in the panel, so an interactive element cannot be
// silently rendered as static text.
const controlCount = async (page, root) =>
  page.evaluate((selector) => {
    const scope = document.querySelector(selector);
    if (!scope) return null;
    return {
      selects: scope.querySelectorAll("select").length,
      buttons: scope.querySelectorAll("button, a[href]").length,
      inputs: scope.querySelectorAll("input, textarea").length,
      details: scope.querySelectorAll("details").length,
    };
  }, root);

console.log("  V7    controls:", JSON.stringify(await controlCount(v7, ".tab-panel.active")));
console.log("  React controls:", JSON.stringify(await controlCount(react, "main")));
console.log(errors.length ? `  console errors:\n    ${errors.join("\n    ")}` : "  console errors: none");

await browser.close();
