import { test, expect } from "@playwright/test";

import { clippedContent, contrastFailures, horizontalOverflow } from "./audit";

/**
 * P2 browser pass — the checks jsdom cannot make.
 *
 * Every defect found on P1 by opening it (an undefined colour token rendering
 * invisible text, labels wrapping, 22px tap targets) was invisible to the unit
 * suite and to the parity gate. This runs the same interrogation against
 * /practitioners, and stays as a permanent gate rather than a one-off look.
 */

const TIERS = [
  { w: 320, h: 640, name: "320 small mobile" },
  { w: 768, h: 1024, name: "768 tablet" },
  { w: 1440, h: 900, name: "1440 desktop" },
  { w: 640, h: 320, name: "640x320 landscape phone" },
];

test.describe("/practitioners", () => {
  test("loads with no console errors", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(String(error)));

    await page.goto("/practitioners");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("meets AA contrast against composited backdrops", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/practitioners");
    const failures = await contrastFailures(page);
    expect(
      failures,
      failures.map((f) => `${f.ratio}:1 — ${f.text}`).join("\n"),
    ).toEqual([]);
  });

  for (const tier of TIERS) {
    test(`holds together at ${tier.name}`, async ({ page }) => {
      await page.setViewportSize({ width: tier.w, height: tier.h });
      await page.goto("/practitioners");

      const overflow = await horizontalOverflow(page);
      expect(overflow.over, `overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

      // Nothing may be clipped out of reach by a height-constrained container.
      // Shared with `auditPage` rather than restated here — this was a second
      // copy of the same query, and only one of the two got the fix that tells
      // clipped decoration apart from clipped content.
      const clipped = await clippedContent(page);
      expect(clipped, clipped.join("\n")).toEqual([]);

      // The last line of the page must be reachable by scrolling.
      const copyright = page.locator("footer p", { hasText: "All rights reserved" });
      await copyright.scrollIntoViewIfNeeded();
      await expect(copyright).toBeInViewport();
    });
  }

  test("perks toggle reveals the hidden perks", async ({ page }) => {
    await page.goto("/practitioners");
    const toggle = page.getByRole("button", { name: /Show more/ });
    const hidden = page.getByText("Max 25 participants per session. Curated.");

    await expect(hidden).toBeHidden();
    await toggle.click();
    await expect(hidden).toBeVisible();
    await expect(page.getByRole("button", { name: /Show less/ })).toBeVisible();
  });

  test("the application dialog traps focus, closes on Escape, and restores scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/practitioners");

    // Both the hero and the closing CTA carry this label; the hero opens first.
    const opener = page.getByRole("button", { name: "Apply to Join the Network", exact: true }).first();
    await opener.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Locking the body hands the dialog the only path to its own overflow.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const scrolls = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"] > div:last-child') as HTMLElement;
      return panel.scrollHeight > panel.clientHeight ? getComputedStyle(panel).overflowY : "auto";
    });
    expect(scrolls).toBe("auto");

    // Tab must never leave the dialog.
    for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(
      true,
    );

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });

  test("every tap target clears 44px on a coarse pointer", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 640 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto("/practitioners");

    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a,button")]
        .filter((el) => el.offsetParent !== null)
        // WCAG 2.5.8 exempts a target "in a sentence or block of text" — an
        // inline link inside a paragraph cannot be 44px tall without breaking
        // the line it sits in.
        .filter((el) => !(el.tagName === "A" && getComputedStyle(el).display === "inline"))
        .map((el) => ({ label: (el.textContent || "").trim().slice(0, 40), h: el.getBoundingClientRect().height }))
        .filter((el) => el.h > 0 && el.h < 44),
    );
    expect(small, small.map((s) => `${s.h}px — ${s.label}`).join("\n")).toEqual([]);
    await context.close();
  });
});
