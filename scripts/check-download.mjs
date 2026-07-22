/** Signs in and follows the Agreements panel's Download link, checking that the
 *  response is really a PDF and that its bytes are a well-formed document. */
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30000 });
await page.evaluate(() => document.querySelector('[data-tab="agreements"]')?.click());
await page.waitForTimeout(500);

const links = page.locator('a[href*="/pdf"]');
const n = await links.count();
console.log("download links:", n);
for (let i = 0; i < n; i++) {
  const href = await links.nth(i).getAttribute("href");
  const res = await page.request.get("http://localhost:3000" + href);
  const buf = await res.body();
  const head = buf.subarray(0, 5).toString("latin1");
  const trailer = buf.subarray(-1024).toString("latin1").includes("%%EOF");
  console.log(`  ${href} -> ${res.status()} ${res.headers()["content-type"]} ${buf.length}b magic=${head} eof=${trailer}`);
  console.log(`     disposition: ${res.headers()["content-disposition"]}`);
}
// A signed-out request must not reach the document.
const anon = await browser.newContext();
const bare = await anon.request.get("http://localhost:3000" + (await links.first().getAttribute("href")), { maxRedirects: 0 });
console.log("unauthenticated:", bare.status(), bare.headers()["location"] ?? "");
await browser.close();
