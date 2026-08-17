import { test, expect, type Locator } from "@playwright/test";

/**
 * A form dropdown takes the fill of the hero's "Taught by Active Professionals"
 * pill under the pointer, and nothing at rest (client, 2026-08-17).
 *
 * In the browser rather than in a unit test because the colour *is* the
 * requirement and a class list cannot show it. The rule is also one Tailwind
 * can lose quietly: `bg-surface` from the shared control recipe and the tint
 * are both background rules, so without `enabled:` raising the specificity,
 * which one wins comes down to stylesheet order — and the class list reads
 * correctly either way.
 *
 * The expected colour is read off the pill rather than hardcoded, so this
 * asserts the two genuinely match instead of asserting one hex twice. Rebrand
 * the pill and this follows it; let them drift apart and it fails.
 */

const background = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).backgroundColor);

/** BASE transitions `background-color` over 150ms; outlast it before reading. */
const SETTLE = 300;

test("the waitlist dropdowns take the pill's fill on hover only", async ({ page }) => {
  await page.goto("/");

  const tint = await background(page.getByText("Taught by Active Professionals").first());

  await page.getByRole("button", { name: /Join the Waitlist/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  const selects = dialog.locator("select");
  const count = await selects.count();
  expect(count, "the waitlist form has dropdowns to check").toBeGreaterThan(0);

  const topic = selects.first();
  const atRest = await background(topic);
  expect(atRest, "at rest the dropdown is untinted").not.toBe(tint);

  await topic.hover();
  await page.waitForTimeout(SETTLE);
  expect(await background(topic), "under the pointer it takes the pill's fill").toBe(tint);

  // Only the one being pointed at. A tint that latched onto every dropdown at
  // once would still satisfy the assertion above.
  if (count > 1) {
    expect(await background(selects.nth(1)), "its neighbour stays untinted").toBe(atRest);
  }

  // And it lets go. A hover rule with nothing to fall back to would leave the
  // last-pointed-at control tinted for the rest of the visit.
  await dialog.getByRole("heading", { name: "Join the Waitlist" }).hover();
  await page.waitForTimeout(SETTLE);
  expect(await background(topic), "the tint lifts when the pointer leaves").toBe(atRest);

  // Legibility is what a tint can quietly cost, so it is measured rather than
  // assumed: ink on this fill is ~14.9:1.
  await topic.hover();
  await page.waitForTimeout(SETTLE);
  const contrast = await topic.evaluate((el) => {
    const luminance = (value: string) => {
      const [r, g, b] = value.match(/\d+/g)!.slice(0, 3).map((n) => {
        const c = Number(n) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const style = getComputedStyle(el);
    const [hi, lo] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  });
  expect(contrast, "hovered dropdown text must still clear WCAG AA").toBeGreaterThanOrEqual(4.5);
});
