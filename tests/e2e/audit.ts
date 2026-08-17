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

      // The same clause exempts incidental text. `aria-hidden` marks a node the
      // accessibility tree ignores, which here is punctuation standing in for a
      // gap — the "·" between the legal links is a 1.15:1 divider, and it is
      // meant to be barely there. Raising it to pass would be drawing attention
      // to a separator at the cost of the links it separates. Judged decorative
      // by the author's own marking rather than by this file guessing.
      if (el.closest('[aria-hidden="true"]')) continue;

      // NOT a WCAG exemption, and recorded as such: `.btn-gold` puts a white
      // label on --color-gold at 2.62:1, which fails AA for text. It is here
      // because the client chose the exact V7 visual over the contrast note
      // after being shown both — the decision is written at the `gold` variant
      // in `features/landing/RequestSession.tsx`, and this skip exists so the
      // gate keeps failing on everything that is NOT that decision. Delete this
      // line the day the client revisits it; do not widen it.
      if (el.closest(".bg-gold")) continue;

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

/**
 * Height-constrained containers hiding something a person needs.
 *
 * `scrollHeight > clientHeight` alone does not mean that. `overflow: hidden` is
 * also the correct tool for clipping decoration — the practitioners hero hangs a
 * radial glow 80px below itself and clips it deliberately, which this read as
 * unreachable content at two viewports and reported forever.
 *
 * So the overflow has to be traced to something that is actually content. A
 * `position: absolute; pointer-events: none` layer is decoration by
 * construction: nothing can be clicked in it and nothing lands on it by
 * scrolling. `aria-hidden` says the same in the author's own words. Everything
 * else spilling past the edge is the defect this is here to catch — a control or
 * a paragraph put out of reach, which from the user's side does not exist.
 */
async function clippedContent(page: Page) {
  return page.evaluate(() => {
    const decorative = (el: Element, stopAt: Element) => {
      for (let n: Element | null = el; n && n !== stopAt; n = n.parentElement) {
        const style = getComputedStyle(n);
        if (style.position === "absolute" && style.pointerEvents === "none") return true;
        if (n.getAttribute("aria-hidden") === "true") return true;
      }
      return false;
    };

    const clipped: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("section,div,ul")) {
      if (getComputedStyle(el).overflowY !== "hidden") continue;
      if (el.scrollHeight <= el.clientHeight + 2) continue;

      const box = el.getBoundingClientRect();
      const hides = [...el.querySelectorAll<HTMLElement>("*")].some((child) => {
        if (decorative(child, el)) return false;
        const rect = child.getBoundingClientRect();
        return rect.height > 0 && (rect.bottom > box.bottom + 2 || rect.top < box.top - 2);
      });
      if (hides) clipped.push(el.className.toString().slice(0, 60));
    }
    return clipped;
  });
}

/** Every audit that applies to any page, at one viewport. */
export async function auditPage(page: Page, path: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(path);

  const overflow = await horizontalOverflow(page);
  expect(overflow.over, `overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`).toBe(false);

  const clipped = await clippedContent(page);
  expect(clipped, clipped.join("\n")).toEqual([]);
}

export { horizontalOverflow, contrastFailures, clippedContent };
