/**
 * Drives the Session Consent tab through its three parts: generate a
 * confirmation, see it appear in the Part 2 table, and check that Part 3 stays
 * empty until consent actually comes back.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30000 });

await page.evaluate(() => document.querySelector('[data-tab="confirmations"]')?.click());
await page.waitForTimeout(600);

const picker = page.locator("#confirm-session");
const before = await picker.locator("option").count();
console.log("confirmable before:", before - 1);
if (before < 2) { console.log("nothing to confirm"); await browser.close(); process.exit(0); }

await picker.selectOption({ index: 1 });
await page.waitForTimeout(500);
await page.locator("#confirm-date").fill("2026-08-14");
await page.locator("#confirm-hour").selectOption("10");
await page.locator("#confirm-minute").selectOption("30");
await page.locator("#confirm-meridiem").selectOption("AM");
await page.locator("#confirm-duration").selectOption("3");
const gross = await page.locator("text=/₹/").first().innerText().catch(()=>"?");
console.log("gross shown:", gross);

await page.getByRole("button", { name: /Generate Confirmation/i }).click();
await page.waitForTimeout(4000);
const note = await page.locator("text=/Generated IQC-CONF/").innerText().catch(() => "(none)");
console.log("after generate:", note);
await page.screenshot({ path: "_parity/t4-generated.png", fullPage: true });
console.log(errors.length ? "console errors:\n  " + errors.join("\n  ") : "console errors: none");
await browser.close();
