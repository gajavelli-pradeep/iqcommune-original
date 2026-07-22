/** Records an invoice reference and marks a payout paid, then checks the
 *  "amount pending" total actually moves — the figure finance reads. */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await p.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin|console|user/, { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-tab="payouts"]')?.click());
await p.waitForTimeout(700);

const before = await p.locator("text=/Amount pending/").locator("..").innerText();
console.log("before:", before.replace(/\n/g, " "));

const inv = p.locator('input[id$="-invoice"]').first();
await inv.fill("IQC-INV-9001");
await inv.blur();
await p.waitForTimeout(2500);

await p.locator('select[id$="-payout-status"]').first().selectOption("Paid");
await p.waitForTimeout(3500);

await p.evaluate(() => document.querySelector('[data-tab="payouts"]')?.click());
await p.waitForTimeout(700);
const after = await p.locator("text=/Amount pending/").locator("..").innerText();
console.log("after: ", after.replace(/\n/g, " "));
await p.screenshot({ path: "_parity/t7-paid.png", fullPage: true });
console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
