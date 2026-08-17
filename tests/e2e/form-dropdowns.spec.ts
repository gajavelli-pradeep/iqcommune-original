import { test, expect, type Locator } from "@playwright/test";

/**
 * A form dropdown answers to the same two states as the pick-one buttons above
 * it (client, 2026-08-17): the edge goes gold under the pointer, and answering
 * fills.
 *
 * Every expectation is read off the "Who is this for?" buttons rather than
 * written as a hex, because matching them *is* the requirement. Restyle the
 * buttons and this follows; let the two drift apart and it fails — which a
 * hardcoded colour could never catch.
 *
 * In the browser and not in a unit test for two reasons. The colours are the
 * requirement and a class list cannot show them; and the rules lean on `:has()`
 * and `enabled:` to outrank the shared recipe's single-class border and
 * background, so a class list can read correctly while the rendered pixel is
 * wrong.
 */

const style = (locator: Locator) =>
  locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { border: cs.borderTopColor, background: cs.backgroundColor, text: cs.color };
  });

test("a dropdown wears the same states as the buttons above it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Join the Waitlist/ }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  /** BASE transitions border and background over 150ms; outlast it before reading. */
  const pause = () => page.waitForTimeout(300);

  const group = dialog.getByRole("button", { name: /Group \(register as SPOC\)/ });
  const other = dialog.getByRole("button", { name: /Organisations & Institutions/ });
  const topic = dialog.locator("select").first();

  // ── the reference vocabulary, from the buttons themselves ────────────────
  await group.hover();
  await pause();
  const buttonHovered = await style(group);

  await group.click();
  await other.hover(); // pointer off, so this is the chosen state alone
  await pause();
  const buttonChosen = await style(group);

  // ── at rest: nothing borrowed ────────────────────────────────────────────
  const atRest = await style(topic);
  expect(atRest.background, "an unanswered dropdown is not filled").not.toBe(buttonChosen.background);
  expect(atRest.border, "an unanswered dropdown does not wear the gold edge").not.toBe(
    buttonHovered.border,
  );

  // ── hover: the edge only, exactly as the buttons do it ───────────────────
  await topic.hover();
  await pause();
  const hovered = await style(topic);
  expect(hovered.border, "hover moves the edge to the buttons' gold").toBe(buttonHovered.border);
  expect(hovered.background, "hover must NOT fill — filling is what answering means").toBe(
    atRest.background,
  );

  // Only the control under the pointer. A rule that latched onto every dropdown
  // would still satisfy the assertion above.
  const count = await dialog.locator("select").count();
  if (count > 1) {
    const neighbour = await style(dialog.locator("select").nth(1));
    expect(neighbour.border, "its neighbour keeps the plain edge").toBe(atRest.border);
  }

  // And it lets go, rather than leaving the last-pointed-at control lit.
  await dialog.getByRole("heading", { name: "Join the Waitlist" }).hover();
  await pause();
  expect((await style(topic)).border, "the edge lifts when the pointer leaves").toBe(atRest.border);

  // ── answered: the chosen treatment, matched on all three properties ──────
  const answer = await topic.evaluate(
    (el: HTMLSelectElement) => [...el.options].find((option) => option.value !== "")!.value,
  );
  await topic.selectOption(answer);
  await pause();
  const answered = await style(topic);
  expect(answered.background, "an answered dropdown fills like a chosen button").toBe(
    buttonChosen.background,
  );
  expect(answered.border, "…with the same edge").toBe(buttonChosen.border);
  expect(answered.text, "…and the same lettering").toBe(buttonChosen.text);

  // Going back to the placeholder gives it up again — no state to keep in step.
  await topic.selectOption("");
  await pause();
  expect((await style(topic)).background, "re-choosing the placeholder empties it").toBe(
    atRest.background,
  );

  // ── the open list, where the browser used to draw its own blue ───────────
  //
  // Only reachable where `appearance: base-select` is: elsewhere the list is
  // drawn by the browser and neither styleable nor inspectable, which is the
  // documented ceiling rather than a failure.
  const styleable = await page.evaluate(() => CSS.supports("appearance", "base-select"));
  test.skip(!styleable, "this browser still draws the option list itself");

  await topic.click();
  await pause();

  const row = topic.locator("option").nth(1);
  await row.hover();
  await pause();
  const hoveredRow = await style(row);

  expect(hoveredRow.background, "a row under the pointer wears the chosen fill").toBe(
    buttonChosen.background,
  );
  expect(hoveredRow.text, "…and the chosen lettering").toBe(buttonChosen.text);
});
