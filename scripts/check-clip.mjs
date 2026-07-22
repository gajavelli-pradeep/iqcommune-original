/** Reports any control inside the open detail card whose right edge is cut off
 *  by the table's horizontal scroll region — the classic "button exists but is
 *  unreachable on a phone" defect. */
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
for (const width of [320, 390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 800, isMobile: width < 800 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector('[data-tab="practitioners"]')?.click());
  await page.waitForTimeout(350);
  const t = page.locator("table tbody tr button[aria-expanded]");
  if (await t.count()) { await t.first().click(); await page.waitForTimeout(450); }
  const out = await page.evaluate(() => {
    const card = document.querySelector("td[id] > div");
    if (!card) return { err: "no card" };
    const region = card.closest("[class*='overflow']") ?? document.documentElement;
    const rb = region.getBoundingClientRect();
    const clipped = [];
    for (const el of card.querySelectorAll("button, a[href], select")) {
      const b = el.getBoundingClientRect();
      if (!b.width) continue;
      if (b.right > rb.right + 1 || b.left < rb.left - 1) clipped.push((el.textContent||el.getAttribute("aria-label")||"?").trim().slice(0,32));
    }
    return { cardW: Math.round(card.getBoundingClientRect().width), regionW: Math.round(rb.width), clipped };
  });
  console.log(`${String(width).padStart(4)}px  card=${out.cardW} region=${out.regionW}  clipped=${out.clipped?.length ?? "?"}${out.clipped?.length ? " → " + out.clipped.join(", ") : ""}`);
  await page.close();
}
await browser.close();
