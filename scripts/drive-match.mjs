/**
 * Drives the Session Requests match end to end: opens a request, checks that
 * matching is REFUSED while the terms are blank, fills them in, then matches.
 *
 * The refusal is the part worth testing — a match that silently succeeds with
 * no practitioner would create a session nobody is delivering.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30000 });

await page.evaluate(() => document.querySelector('[data-tab="requests"]')?.click());
await page.waitForTimeout(500);
await page.locator("table tbody tr button[aria-expanded]").first().click();
await page.waitForTimeout(500);

const assignee = page.locator('select[id$="-assignee"]').first();
const options = await assignee.locator("option").allInnerTexts();
console.log("assignable practitioners:", JSON.stringify(options));

// 1. Match with nothing filled in — must be refused, visibly.
const status = page.locator('select[id$="-status"]').first();
await status.selectOption("Matched");
await page.waitForTimeout(2500);
const refusal = await page.locator('[role="alert"]').first().innerText().catch(() => "");
console.log("refusal shown:", JSON.stringify(refusal.trim()));

// 2. Fill the terms, then match.
if (options.length > 1) {
  await assignee.selectOption({ index: 1 });
  await page.waitForTimeout(2000);
  const payout = page.locator('input[id$="-payout"]').first();
  await payout.fill("7500");
  await payout.blur();
  await page.waitForTimeout(2000);
  await status.selectOption("Matched");
  await page.waitForTimeout(3000);
  const after = await page.locator('[role="alert"]').first().innerText().catch(() => "");
  console.log("after filling terms, alert:", JSON.stringify(after.trim()) || "(none)");
}
await page.screenshot({ path: "_parity/t3-match.png", fullPage: true });
console.log(errors.length ? "console errors:\n  " + errors.join("\n  ") : "console errors: none");
await browser.close();
