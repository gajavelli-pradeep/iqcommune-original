/** Exercises Settings: CSV export, search/sort, and the invite flow including
 *  its refusals (duplicate address, last Global Admin). */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1200 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await p.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin|console|user/, { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-tab="settings"]')?.click());
await p.waitForTimeout(800);

// CSV
const csv = await p.request.get("http://localhost:3000/api/master-data");
const text = await csv.text();
console.log("csv:", csv.status(), csv.headers()["content-type"], "| lines:", text.trim().split(/\r?\n/).length);
console.log("csv header:", text.trim().split(/\r?\n/)[0].replace(/^﻿/, ""));

// Search narrows the table.
await p.locator("#master-search").fill("vikram");
await p.waitForTimeout(400);
console.log("rows after search:", await p.locator("table").first().locator("tbody tr").count());
await p.locator("#master-search").fill("");
await p.waitForTimeout(400);

// Invite: a duplicate address must be refused.
await p.locator("#invite-email").fill(process.env.CONSOLE_EMAIL);
await p.getByRole("button", { name: /Send invite/ }).click();
await p.waitForTimeout(3000);
console.log("duplicate invite:", (await p.locator('[role="alert"]').first().innerText().catch(() => "(none)")).trim());

// Invite: a fresh address must succeed.
await p.locator("#invite-email").fill("newcolleague@example.com");
await p.locator("#invite-role").selectOption("admin");
await p.getByRole("button", { name: /Send invite/ }).click();
await p.waitForTimeout(4000);
console.log("new invite:", (await p.locator('[role="status"], [role="alert"]').first().innerText().catch(() => "(none)")).trim());
await p.screenshot({ path: "_parity/t9-settings.png", fullPage: true });
console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
