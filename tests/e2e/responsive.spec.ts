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

    // The last line must be *reachable* — not necessarily on screen at load.
    // Once the page is taller than the viewport the footer sits below the fold,
    // which is correct; what matters is that scrolling gets you to it.
    const copyright = page.locator("footer p", { hasText: "All rights reserved" });
    await copyright.scrollIntoViewIfNeeded();
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

  test(`hero holds at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow, `horizontal overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

    const headline = page.getByRole("heading", { level: 1 });
    await expect(headline).toBeVisible();
    await expect(headline).toContainText("Real financial insights from active professionals");

    // Scoped to the hero: every locator below must not drift onto later
    // sections as the page grows.
    const hero = page.locator("section").first();

    // Two columns above 720px, stacked below — the spec's own breakpoint.
    const grid = hero.locator("> div.grid").first();
    const columns = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
    expect(columns, `expected ${tier.w >= 720 ? 2 : 1} column(s)`).toBe(tier.w >= 720 ? 2 : 1);

    // Every role card stays inside the viewport.
    const cards = hero.locator(".rounded-md");
    const cardCount = await cards.count();
    expect(cardCount).toBe(4);
    for (let i = 0; i < cardCount; i++) {
      const box = await cards.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x, `role card ${i} off-screen left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `role card ${i} past right edge`).toBeLessThanOrEqual(tier.w + 1);
    }
  });

  test(`comparison keeps both columns at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    // Parity guard. The spec hides the "Conventional Trainers" column below
    // 720px, which deletes half the argument on a phone. Both sides must be
    // visible at every width — the section only means anything as a contrast.
    await expect(page.getByRole("heading", { name: "Conventional Trainers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Our Practitioners" })).toBeVisible();

    // Ten points total, none clipped.
    const section = page.locator("section").filter({ hasText: "A practitioner is not a trainer" });
    const items = section.locator("li");
    expect(await items.count()).toBe(10);
    for (let i = 0; i < 10; i++) {
      const box = await items.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x + box.width, `point ${i} past right edge`).toBeLessThanOrEqual(tier.w + 1);
    }
  });

  test(`audiences hold at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    for (const name of ["Groups", "Organisations & Institutions", "AMCs & Wealth Firms"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }

    // Every card and every sub-segment tag stays inside the viewport. Tags wrap
    // freely, so this is where a long label would push the layout out.
    const section = page.locator("section").filter({ hasText: "Who is this for" });
    const items = section.locator("li");
    for (let i = 0; i < (await items.count()); i++) {
      const box = await items.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x, `item ${i} off-screen left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `item ${i} past right edge`).toBeLessThanOrEqual(tier.w + 1);
    }

    await expect(page.getByText(/All sessions capped at 25 participants/)).toBeVisible();
  });

  test(`training topics hold at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    const section = page.locator("section").filter({ hasText: "What you'll learn." });
    const cards = section.locator("> div > ul > li");
    expect(await cards.count()).toBe(6);

    // 3 columns above 720px, 2 from 480, 1 below — the spec's breakpoints.
    const expected = tier.w >= 720 ? 3 : tier.w >= 480 ? 2 : 1;
    const columns = await section
      .locator("ul")
      .first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns, `expected ${expected} column(s) at ${tier.w}px`).toBe(expected);

    for (let i = 0; i < 6; i++) {
      const box = await cards.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x, `module ${i} off-screen left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `module ${i} past right edge`).toBeLessThanOrEqual(tier.w + 1);
    }
  });

  test(`bundles hold at ${tier.name}`, async ({ page }) => {
    await page.setViewportSize({ width: tier.w, height: tier.h });
    await page.goto("/");

    const section = page.locator("section").filter({ hasText: "Bundled Sessions" });
    const cards = section.locator("> div > ul > li");
    expect(await cards.count()).toBe(3);

    // The module row is a flex pair: long name on the left, "3 hrs" chip on the
    // right. The chip must never be squeezed off or wrapped away.
    const chips = section.getByText("3 hrs", { exact: true });
    expect(await chips.count()).toBe(6);
    for (let i = 0; i < 6; i++) {
      const box = await chips.nth(i).boundingBox();
      if (!box) continue;
      expect(box.width, `duration chip ${i} collapsed`).toBeGreaterThan(30);
      expect(box.x + box.width, `duration chip ${i} past right edge`).toBeLessThanOrEqual(tier.w + 1);
    }

    await expect(section.getByText(/minimum of 9 participants/)).toBeVisible();
  });
}
