import { expect, type Page } from "@playwright/test";

/**
 * Shared browser audits.
 *
 * Extracted at their second use, when /rate and /consent needed the same
 * interrogation as /practitioners. The contrast helper in particular is worth
 * having once: it took three attempts to make trustworthy, and a second copy
 * would drift from the corrections.
 */

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

/** Every audit that applies to any page, at one viewport. */
export async function auditPage(page: Page, path: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(path);

  const overflow = await horizontalOverflow(page);
  expect(overflow.over, `overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("section,div,ul")]
      .filter(
        (el) => getComputedStyle(el).overflowY === "hidden" && el.scrollHeight > el.clientHeight + 2,
      )
      .map((el) => el.className.toString().slice(0, 60)),
  );
  expect(clipped, clipped.join("\n")).toEqual([]);
}

export { horizontalOverflow, contrastFailures };
