/**
 * Re-measures the console detail card's controls under a COARSE pointer, which
 * is the only configuration where the touch-target rules actually apply. The
 * desktop pass cannot see them, so it reports false failures.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
await page.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelector('[data-tab="practitioners"]')?.click());
await page.waitForTimeout(400);
const toggles = page.locator("table tbody tr button[aria-expanded]");
if (await toggles.count()) { await toggles.first().click(); await page.waitForTimeout(500); }

const report = await page.evaluate(() => {
  const tooSmall = [];
  for (const el of document.querySelectorAll("button, a[href], select")) {
    const box = el.getBoundingClientRect();
    if (!box.width && !box.height) continue;
    // The pseudo-element carries the tap area, so measure that where present.
    const after = getComputedStyle(el, "::after");
    const h = Math.max(box.height, parseFloat(after.height) || 0);
    const w = Math.max(box.width, parseFloat(after.width) || 0);
    if (h < 44 || w < 44) tooSmall.push(`${(el.textContent||el.getAttribute("aria-label")||el.tagName).trim().slice(0,30)} ${Math.round(w)}x${Math.round(h)}`);
  }
  return { tooSmall, pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
});
console.log("page h-scroll:", report.pageScrolls ? "YES" : "no");
console.log(report.tooSmall.length ? "under 44px:\n  " + report.tooSmall.join("\n  ") : "under 44px: none");
await page.screenshot({ path: "_parity/resp-touch-390.png", fullPage: true });
await browser.close();
