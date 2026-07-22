/**
 * Signs in to the real console and drives one row action, so a workflow can be
 * checked end-to-end rather than inferred from the code.
 *
 * It uses `/login` and the real route rather than the dev preview on purpose:
 * every mutation re-checks the capability server-side (`requireCapability`), so
 * an unauthenticated preview can render the controls but can never prove that
 * clicking one writes anything.
 *
 * Row actions hold for 15 seconds behind an Undo toast (procedure §114), so
 * this waits the window out before looking for the result.
 *
 * Usage:
 *   node scripts/drive-console.mjs "<button text>" [tab-id]
 * Credentials come from CONSOLE_EMAIL / CONSOLE_PASSWORD in the environment.
 */

import { chromium } from "@playwright/test";

const BUTTON = process.argv[2];
const TAB = process.argv[3] ?? "practitioners";
const EMAIL = process.env.CONSOLE_EMAIL;
const PASSWORD = process.env.CONSOLE_PASSWORD;

if (!BUTTON) throw new Error("pass the button text to click");
if (!EMAIL || !PASSWORD) throw new Error("set CONSOLE_EMAIL and CONSOLE_PASSWORD");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

// ── Sign in ─────────────────────────────────────────────────────────────────
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(EMAIL);
await page.getByLabel(/password/i).first().fill(PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });
console.log(`signed in — landed on ${new URL(page.url()).pathname}`);

await page.evaluate((tab) => {
  const control = document.querySelector(`[data-tab="${tab}"]`);
  if (control instanceof HTMLElement) control.click();
}, TAB);
await page.waitForTimeout(400);

// ── Find the action ─────────────────────────────────────────────────────────
// Some panels put their actions straight in the row; others hide them in the
// detail card, so the visible table is tried first and rows are opened only if
// that finds nothing.
const named = page.getByRole("button", { name: BUTTON });
let target = (await named.count()) ? named.first() : null;

const toggles = page.locator("table tbody tr button[aria-expanded]");
const count = target ? 0 : await toggles.count();

for (let index = 0; index < count; index += 1) {
  await toggles.nth(index).click();
  await page.waitForTimeout(300);
  if (await named.count()) {
    target = named.first();
    break;
  }
  await toggles.nth(index).click();
  await page.waitForTimeout(150);
}

if (!target) {
  console.log(`no row offers "${BUTTON}" (${count} rows)`);
  await page.screenshot({ path: "_parity/drive-nomatch.png", fullPage: true });
  await browser.close();
  process.exit(1);
}

await target.click();
console.log(`clicked "${BUTTON}" — waiting out the 15s Undo window…`);
await page.waitForTimeout(19_000);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2_000);

await page.screenshot({ path: "_parity/drive-after.png", fullPage: true });
console.log(errors.length ? `console errors:\n  ${errors.join("\n  ")}` : "console errors: none");
await browser.close();
