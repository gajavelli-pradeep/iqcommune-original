/**
 * Opens every row of a console tab in turn and screenshots the detail card it
 * reveals, so each status variant of the card can be compared against V7.
 *
 * The card differs by status — which is the point of shooting all of them
 * rather than one — so this also prints the row labels alongside the file each
 * ended up in.
 *
 * Usage: node scripts/shoot-expanded.mjs [tab-id] [label]
 */

import { chromium } from "@playwright/test";

const TAB = process.argv[2] ?? "practitioners";
const LABEL = process.argv[3] ?? `${TAB}-expand`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });
await page.evaluate((tab) => {
  const control = document.querySelector(`[data-tab="${tab}"]`);
  if (control instanceof HTMLElement) control.click();
}, TAB);
await page.waitForTimeout(400);

const toggles = page.locator("table tbody tr button[aria-expanded]");
const count = await toggles.count();
console.log(`tab=${TAB} rows=${count}`);

for (let index = 0; index < count; index += 1) {
  const toggle = toggles.nth(index);
  const label = (await toggle.innerText()).replace(/\s+/g, " ").trim();

  await toggle.click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `_parity/${LABEL}-${index}.png`, fullPage: true });
  console.log(`  ${LABEL}-${index}.png  ${label}`);

  await toggle.click();
  await page.waitForTimeout(200);
}

console.log(errors.length ? `console errors:\n  ${errors.join("\n  ")}` : "console errors: none");
await browser.close();
