/**
 * Screenshots one console tab in the React preview and in the V7 HTML at the
 * same viewport, so the two can be compared side by side.
 *
 * Usage: node scripts/shoot-console.mjs <tab-id> [label]
 *   e.g. node scripts/shoot-console.mjs practitioners t1
 *
 * The V7 file is a single page whose tabs are `.tab-panel` divs toggled by a
 * class, so the shot is taken by activating the wanted panel directly rather
 * than by clicking through the sidebar.
 */

import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TAB = process.argv[2] ?? "practitioners";
const LABEL = process.argv[3] ?? TAB;

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "_parity");
// The tracked spec (spec/v7), so this runs in a fresh clone.
const V7 = path.join(here, "..", "spec", "v7", "iqcommune-admin-console-automated.html");

const VIEWPORT = { width: 1440, height: 1200 };

const browser = await chromium.launch();

// ── V7 reference ────────────────────────────────────────────────────────────
const v7 = await browser.newPage({ viewport: VIEWPORT });
await v7.goto(`file://${V7.split(path.sep).join("/")}`);
await v7.evaluate((tab) => {
  for (const panel of document.querySelectorAll(".tab-panel")) panel.classList.remove("active");
  document.getElementById(`panel-${tab}`)?.classList.add("active");
}, TAB);
await v7.waitForTimeout(400);
await v7.screenshot({ path: path.join(OUT, `${LABEL}-v7.png`), fullPage: true });

// ── React ───────────────────────────────────────────────────────────────────
const react = await browser.newPage({ viewport: VIEWPORT });
const errors = [];
react.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
react.on("pageerror", (error) => errors.push(String(error)));

await react.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });

// The shell renders every panel and shows one; open the wanted tab by its
// sidebar control so the shot goes through the same path a user does.
const opened = await react.evaluate((tab) => {
  const control = document.querySelector(`[data-tab="${tab}"], #tab-${tab}`);
  if (control instanceof HTMLElement) {
    control.click();
    return true;
  }
  return false;
}, TAB);

await react.waitForTimeout(500);
await react.screenshot({ path: path.join(OUT, `${LABEL}-react.png`), fullPage: true });

console.log(`tab=${TAB} openedViaControl=${opened}`);
console.log(errors.length ? `console errors:\n  ${errors.join("\n  ")}` : "console errors: none");

await browser.close();
