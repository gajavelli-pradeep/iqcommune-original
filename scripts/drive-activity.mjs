/** Pages through the audit trail and checks the range, totals and gating. */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await p.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin|console|user/, { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-tab="activity"]')?.click());
await p.waitForTimeout(800);

const range = () => p.locator("nav[aria-label*='pagination'] p").innerText();
console.log("page 1:", (await range()).trim(), "| rows:", await p.locator("table tbody tr").count());
await p.getByRole("button", { name: /Next/ }).first().click();
await p.waitForTimeout(2000);
console.log("page 2:", (await range()).trim(), "| rows:", await p.locator("table tbody tr").count());
await p.getByRole("button", { name: /Previous/ }).first().click();
await p.waitForTimeout(2000);
console.log("back:  ", (await range()).trim());
await p.screenshot({ path: "_parity/t10-activity.png", fullPage: true });

// The paging endpoint must be Global-Admin only.
const anon = await b.newContext();
const bare = await anon.request.get("http://localhost:3000/api/activity?page=1", { maxRedirects: 0 });
console.log("unauthenticated /api/activity:", bare.status(), bare.headers()["location"] ?? "");
console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
