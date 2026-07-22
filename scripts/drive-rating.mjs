/**
 * Exercises the Practitioner Rating cell on Session Details.
 *
 * A completed session with no rating must offer the Global-Admin "Got it
 * verbally?" disclosure, and recording through it must both show the stars and
 * feed the practitioner's average on the Practitioners tab — the average is the
 * whole reason the distinction between a submitted and a recorded rating
 * matters.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

await page.evaluate(() => document.querySelector('[data-tab="sessions"]')?.click());
await page.waitForTimeout(700);

const disclosure = page.getByText(/Got it verbally/i);
console.log("verbal disclosures offered:", await disclosure.count());
if ((await disclosure.count()) === 0) {
  console.log("no completed-and-unrated session to record against");
  await browser.close();
  process.exit(0);
}

await disclosure.first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: "_parity/t5-verbal-open.png", fullPage: true });

const select = page.locator('select[id$="-rating"]').first();
await select.selectOption("4");
await page.getByRole("button", { name: /^Record$/ }).first().click();
await page.waitForTimeout(4000);

const recorded = await page.getByText(/Recorded verbally/i).count();
console.log("cells marked 'Recorded verbally':", recorded);
await page.screenshot({ path: "_parity/t5-verbal-recorded.png", fullPage: true });

// The average on the Practitioners tab must move — that is what the rating is for.
await page.evaluate(() => document.querySelector('[data-tab="practitioners"]')?.click());
await page.waitForTimeout(700);
const averages = await page.locator("text=/★ [0-9.]+ avg/").allInnerTexts();
console.log("practitioner averages shown:", JSON.stringify(averages));

console.log(errors.length ? `console errors:\n  ${errors.join("\n  ")}` : "console errors: none");
await browser.close();
