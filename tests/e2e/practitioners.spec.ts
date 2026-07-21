import { test, expect, type Page } from "@playwright/test";

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

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return { over: d.scrollWidth > d.clientWidth + 1, scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
  });
}

/** Contrast against the real composited backdrop, not a translucent layer. */
async function contrastFailures(page: Page) {
  return page.evaluate(() => {
    // Only plain rgb()/rgba() can be read numerically. Tailwind v4 compiles an
    // opacity modifier such as `bg-surface/95` to `color-mix(in oklab, ...)`,
    // whose numbers are percentages, not channels — scraping digits out of it
    // produces a nonsense colour and, with it, a nonsense contrast ratio. Those
    // layers are skipped rather than guessed at.
    const parse = (c: string): number[] | null =>
      /^rgba?\(/.test(c) ? c.match(/[\d.]+/g)!.map(Number) : null;
    const over = (fg: number[], bg: number[]) => {
      const a = fg.length > 3 ? fg[3] : 1;
      return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
    };
    const lum = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: number[], b: number[]) => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const failures: Array<{ text: string; ratio: number }> = [];
    const white = [255, 255, 255];

    for (const el of document.querySelectorAll<HTMLElement>("p,span,div,li,h1,h2,h3,label,a,button")) {
      const text = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent!.trim())
        .join("");
      if (!text || el.offsetParent === null) continue;
      // WCAG 1.4.3 exempts logotypes: "text that is part of a logo or brand
      // name has no minimum contrast requirement". The gold half of the
      // wordmark is 2.62:1 on white and is deliberately not changed for it.
      if (el.closest('[aria-label="iqcommune — home"]')) continue;

      const layers: number[][] = [];
      for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
        const parsed = parse(getComputedStyle(n).backgroundColor);
        if (!parsed || (parsed.length === 4 && parsed[3] === 0)) continue;
        layers.unshift(parsed);
      }
      let backdrop = white;
      for (const layer of layers) backdrop = over(layer, backdrop);

      const style = getComputedStyle(el);
      const size = Number.parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      // WCAG large text (>=24px, or >=18.66px bold) clears at 3:1.
      const floor = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;

      const colour = parse(style.color);
      if (!colour) continue;
      const value = ratio(over(colour, backdrop), backdrop);
      if (value < floor) failures.push({ text: text.slice(0, 50), ratio: Number(value.toFixed(2)) });
    }
    return failures;
  });
}

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
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("section,div,ul")]
          .filter(
            (el) =>
              getComputedStyle(el).overflowY === "hidden" && el.scrollHeight > el.clientHeight + 2,
          )
          .map((el) => el.className.toString().slice(0, 60)),
      );
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

    const opener = page.getByRole("button", { name: "Apply to Join the Network", exact: true });
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
