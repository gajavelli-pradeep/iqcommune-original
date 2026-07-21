import { test, expect, type Page } from "@playwright/test";

/**
 * Responsive gate — runs against every section as it lands.
 *
 * The six tiers are the standard sweep. 640x320 is the extra one that matters:
 * a landscape phone is the shortest viewport, and it catches content that a
 * tall narrow screen hides. "It fits at 375x812" is not the same claim.
 */
const TIERS = [
  { w: 320, h: 640, name: "320 small mobile" },
  { w: 480, h: 800, name: "480 large mobile" },
  { w: 768, h: 1024, name: "768 tablet" },
  { w: 1024, h: 768, name: "1024 small desktop" },
  { w: 1440, h: 900, name: "1440 desktop" },
  { w: 1920, h: 1080, name: "1920 full HD" },
  { w: 640, h: 320, name: "640x320 landscape phone" },
];

/** Nothing may overflow the viewport horizontally at any width. */
async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return { overflow: d.scrollWidth > d.clientWidth, scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
  });
}

for (const tier of TIERS) {
  test(`footer holds at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow, `horizontal overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

    // Every footer link stays inside the viewport and clears the touch target.
    const links = page.locator("footer a");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box, `link ${i} has no box`).not.toBeNull();
      if (!box) continue;
      expect(box.x, `link ${i} starts off-screen left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `link ${i} runs past the right edge`).toBeLessThanOrEqual(tier.w + 1);
    }

    // The last line must be reachable — the check 640x320 exists for.
    const copyright = page.locator("footer p", { hasText: "All rights reserved" });
    await expect(copyright).toBeInViewport();
  });

  test(`header holds at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow, `horizontal overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

    // The header row must never wrap to a second line. Its height is the tell:
    // 68px by spec, plus the 1px bottom border.
    const header = page.locator("header");
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, "header wrapped to a second line").toBeLessThanOrEqual(70);

    // The wordmark stays inside the viewport at every width.
    const logo = page.getByRole("link", { name: "iqcommune — home" });
    const logoBox = await logo.boundingBox();
    expect(logoBox).not.toBeNull();
    expect(logoBox!.x).toBeGreaterThanOrEqual(0);
    expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(tier.w + 1);

    // The strapline is decoration and is dropped below 640px so the header
    // cannot overflow. It must be present everywhere else.
    // Scoped to the header: the footer tagline contains the same phrase.
    const strapline = page
      .locator("header")
      .getByText("Where financial intelligence connects");
    if (tier.w >= 640) {
      await expect(strapline).toBeVisible();
    } else {
      await expect(strapline).toBeHidden();
    }
  });
}
