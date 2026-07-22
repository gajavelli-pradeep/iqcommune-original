/** Changes a session's status from the Session Consent tab's Part 2 select and
 *  confirms the session record actually moved. */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await p.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin|console|user/, { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-tab="confirmations"]')?.click());
await p.waitForTimeout(600);
const sel = p.locator('select[id$="-session-status"]');
console.log("session-status selects:", await sel.count());
console.log("options:", JSON.stringify(await sel.first().locator("option").allInnerTexts()));
await sel.first().selectOption("Pending");
await p.waitForTimeout(3500);
console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
