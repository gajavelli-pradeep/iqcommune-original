/**
 * Opens a console row's detail card at every breakpoint tier and reports, per
 * width, whether the page scrolls sideways and whether any control is smaller
 * than the 44px touch floor.
 *
 * A card that only ever gets looked at on a 1440px dev screen is the standard
 * way a panel ships broken on a phone.
 *
 * Usage: node scripts/shoot-responsive.mjs [tab-id] [row-index]
 */

import { chromium } from "@playwright/test";

const TAB = process.argv[2] ?? "practitioners";
const ROW = Number(process.argv[3] ?? 1);
const WIDTHS = [320, 480, 768, 1024, 1440, 1920];

const browser = await chromium.launch();

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });

  await page.evaluate((tab) => {
    const control = document.querySelector(`[data-tab="${tab}"]`);
    if (control instanceof HTMLElement) control.click();
  }, TAB);
  await page.waitForTimeout(350);

  const toggles = page.locator("table tbody tr button[aria-expanded]");
  if (await toggles.count()) {
    await toggles.nth(Math.min(ROW, (await toggles.count()) - 1)).click();
    await page.waitForTimeout(400);
  }

  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    // The table is allowed to scroll inside its own region; the PAGE is not.
    const pageScrolls = doc.scrollWidth > doc.clientWidth + 1;

    const small = [];
    for (const el of document.querySelectorAll("button, a[href], select, [role='button']")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.height < 24 || box.width < 24) {
        small.push(`${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 28)}`);
      }
    }
    return { pageScrolls, small: small.slice(0, 6), smallCount: small.length };
  });

  await page.screenshot({ path: `_parity/resp-${width}.png`, fullPage: true });
  // `tiny-controls` is advisory here: this pass runs with a FINE pointer, so
  // the coarse-pointer hit-area expanders are inactive and a deliberately small
  // control (the field-override pencils) reads as a failure. `check-touch.mjs`
  // is the one that decides — it emulates touch, where those rules apply.
  console.log(
    `${String(width).padStart(4)}px  page-h-scroll=${report.pageScrolls ? "YES ✗" : "no"}  tiny-controls=${report.smallCount}${
      report.smallCount ? ` → ${report.small.join(", ")} (advisory — see check-touch.mjs)` : ""
    }`,
  );
  await page.close();
}

await browser.close();
