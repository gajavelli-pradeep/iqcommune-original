/**
 * Drives the Gallery tab: upload drafts, refuse to publish an incomplete one,
 * fill in city and caption, publish, and confirm the photo reaches the public
 * landing page.
 */
import { chromium } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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
await p.evaluate(() => document.querySelector('[data-tab="gallery"]')?.click());
await p.waitForTimeout(700);

await p.locator('input[type="file"]').setInputFiles([
  { name: "room-a.png", mimeType: "image/png", buffer: PNG },
  { name: "room-b.png", mimeType: "image/png", buffer: PNG },
]);
await p.waitForTimeout(7000);
await p.evaluate(() => document.querySelector('[data-tab="gallery"]')?.click());
await p.waitForTimeout(800);
console.log("drafts:", await p.locator('input[id$="-city"]').count());

// Publishing without captions must be refused.
await p.getByRole("button", { name: /Publish/ }).click();
await p.waitForTimeout(2500);
console.log("refusal:", (await p.locator('[role="alert"]').first().innerText().catch(() => "(none)")).trim());

// Fill both, then publish.
const cities = p.locator('input[id$="-city"]');
const captions = p.locator('input[id$="-caption"]');
for (let i = 0; i < await cities.count(); i++) {
  await cities.nth(i).fill(i === 0 ? "Mumbai" : "Pune");
  await cities.nth(i).blur();
  await p.waitForTimeout(1800);
  await captions.nth(i).fill(i === 0 ? "Group discussion, Q&A round" : "Working through the numbers");
  await captions.nth(i).blur();
  await p.waitForTimeout(1800);
}
await p.screenshot({ path: "_parity/t8-draft.png", fullPage: true });

await p.getByRole("button", { name: /Publish/ }).click();
await p.waitForTimeout(4000);
await p.evaluate(() => document.querySelector('[data-tab="gallery"]')?.click());
await p.waitForTimeout(900);
console.log("live tiles:", await p.locator("ul li img").count());
await p.screenshot({ path: "_parity/t8-live.png", fullPage: true });

// The landing page is the actual output of this tab.
const home = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await home.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const captionsOnSite = await home.locator("text=/Group discussion, Q&A round/").count();
console.log("caption visible on landing page:", captionsOnSite > 0);

console.log(errs.length ? "console errors:\n  " + errs.join("\n  ") : "console errors: none");
await b.close();
