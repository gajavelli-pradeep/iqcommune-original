/** Edits DIFFERENT payout rows and checks each write landed on its own record. */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await p.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin|console|user/, { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-tab="payouts"]')?.click());
await p.waitForTimeout(700);

const sessions = await p.$$eval("table tbody tr td:nth-child(2)", (c) => c.map((x) => x.textContent.trim()));
console.log("rows:", JSON.stringify(sessions));

// Type a distinct reference into EACH row, then read them all back.
const fields = p.locator('input[id$="-invoice"]');
const n = await fields.count();
for (let i = 0; i < n; i++) {
  await fields.nth(i).fill(`IQC-INV-ROW${i + 1}`);
  await fields.nth(i).blur();
  await p.waitForTimeout(2500);
}
await p.evaluate(() => document.querySelector('[data-tab="payouts"]')?.click());
await p.waitForTimeout(800);
const after = await p.$$eval('input[id$="-invoice"]', (els) => els.map((e) => e.value));
console.log("invoice refs after:", JSON.stringify(after));
console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
