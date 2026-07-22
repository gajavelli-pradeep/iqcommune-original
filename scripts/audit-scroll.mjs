/**
 * Scroll audit — does each console tab actually scroll to its own bottom?
 *
 * Reported: "scrolling is not working" on some tabs. A page can fail to scroll
 * for reasons that look nothing alike — a leftover body-scroll lock, an
 * ancestor with a fixed height, or a flex column that never grows — so this
 * measures the outcome rather than inspecting the CSS: drive the wheel, then
 * check whether the last row actually came into view.
 *
 * Usage: QA_PASSWORD=… node scripts/audit-scroll.mjs
 */
import { chromium } from "@playwright/test";

const TABS = [
  "practitioners",
  "agreements",
  "requests",
  "confirmations",
  "sessions",
  "photos",
  "payouts",
  "gallery",
  "settings",
  "activity",
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 700 } });
const page = await context.newPage();

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill("qa.globaladmin@example.com");
await page.getByLabel(/password/i).first().fill(process.env.QA_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

for (const tab of TABS) {
  await page.evaluate((id) => {
    const control = document.querySelector(`[data-tab="${id}"]`);
    if (control instanceof HTMLElement) control.click();
    window.scrollTo(0, 0);
  }, tab);
  await page.waitForTimeout(400);

  const before = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollTop: window.scrollY,
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(doc).overflow,
    };
  });

  // Drive the wheel the way a person would, not scrollTo — a scroll LOCK
  // ignores the wheel while still allowing a programmatic jump.
  await page.mouse.move(640, 400);
  for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => window.scrollY);
  const overflows = before.scrollHeight > before.clientHeight + 1;
  const moved = after > before.scrollTop + 10;

  const verdict = !overflows
    ? "fits — nothing to scroll"
    : moved
      ? `scrolls ✓ (${Math.round(after)}px of ${before.scrollHeight - before.clientHeight})`
      : "DOES NOT SCROLL ✗";

  console.log(
    `${tab.padEnd(15)} content=${before.scrollHeight}/${before.clientHeight} ` +
      `body-overflow=${before.bodyOverflow} html-overflow=${before.htmlOverflow} → ${verdict}`,
  );
}

await browser.close();
