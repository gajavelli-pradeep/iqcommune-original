import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Every public form's dropdowns wear one treatment (client, 2026-08-17):
 * the edge goes gold under the pointer, answering fills, and the open list is
 * the brand's rather than the browser's.
 *
 * The treatment is defined once — `selectClass` in `components/ui/control.ts`
 * plus the `.form-select` block in `globals.css` — so every `SelectField` gets
 * it without opting in. That is the reuse, and this file is what keeps it
 * honest: a form is added to `FORMS` and it is held to the same contract. A
 * dropdown that stopped routing through the shared recipe, or a form that grew
 * a hand-rolled `<select>`, fails here rather than quietly drifting.
 *
 * Expectations resolve from the palette at runtime instead of being written as
 * hex, so a rebrand moves them and only a genuine divergence fails.
 */

const FORMS = [
  { name: "waitlist", url: "/", trigger: /Join the Waitlist/ },
  { name: "practitioner application", url: "/practitioners", trigger: /Apply to Join the Network/ },
] as const;

const style = (locator: Locator) =>
  locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { border: cs.borderTopColor, background: cs.backgroundColor, text: cs.color };
  });

/** The palette, as the browser resolves it — never a hardcoded hex. */
function palette(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const resolve = (name: string) => {
      const probe = document.createElement("span");
      probe.style.color = root.getPropertyValue(name).trim();
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    return {
      goldLight: resolve("--color-gold-light"),
      goldBorder: resolve("--color-gold-border"),
      goldDark: resolve("--color-gold-dark"),
      surface: resolve("--color-surface"),
    };
  });
}

async function openForm(page: Page, form: (typeof FORMS)[number]) {
  // `domcontentloaded`, not `networkidle`: the dev server holds an HMR socket
  // open, so networkidle never settles.
  await page.goto(form.url, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: form.trigger }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  return dialog;
}

for (const form of FORMS) {
  test(`${form.name}: dropdowns wear the shared treatment`, async ({ page }) => {
    const dialog = await openForm(page, form);
    const { goldLight, goldBorder, goldDark, surface } = await palette(page);
    /** BASE transitions border and background over 150ms; outlast it. */
    const pause = () => page.waitForTimeout(300);

    const selects = dialog.locator("select");
    const count = await selects.count();
    expect(count, "this form has dropdowns to check").toBeGreaterThan(0);

    const first = selects.first();
    await first.waitFor();
    await first.scrollIntoViewIfNeeded();

    // Unanswered: nothing borrowed from the answered state.
    const atRest = await style(first);
    expect(atRest.background, "an unanswered dropdown is not filled").toBe(surface);
    expect(atRest.border, "…and does not wear the gold edge").not.toBe(goldBorder);

    // Hover moves the edge and must not fill — filling is what answering means.
    await first.hover();
    await pause();
    const hovered = await style(first);
    expect(hovered.border, "hover moves the edge to gold").toBe(goldBorder);
    expect(hovered.background, "hover does not fill").toBe(atRest.background);

    // Only the control under the pointer.
    if (count > 1) {
      expect((await style(selects.nth(1))).border, "its neighbour keeps the plain edge").toBe(
        atRest.border,
      );
    }

    // The open list — the part the browser used to paint its own blue in.
    // Unreachable where `appearance: base-select` is unsupported, which is the
    // documented ceiling rather than a failure.
    const styleable = await page.evaluate(() => CSS.supports("appearance", "base-select"));
    if (styleable) {
      await first.click();
      await pause();
      const row = first.locator("option").nth(1);
      await row.hover();
      await pause();
      const highlighted = await style(row);
      expect(highlighted.background, "a row under the pointer wears the answered fill").toBe(
        goldLight,
      );
      expect(highlighted.text, "…and the answered lettering").toBe(goldDark);

      // Clicking the row closes the list AND answers the field. Escape is not
      // an option: the modal takes it and closes itself, taking the form with
      // it — which reads as a missing dropdown rather than a closed dialog.
      await row.click();
    } else {
      const answer = await first.evaluate(
        (el: HTMLSelectElement) => [...el.options].find((option) => option.value !== "")!.value,
      );
      await first.selectOption(answer);
    }

    // Answered: the full chosen treatment, read with the pointer elsewhere.
    await dialog.getByRole("heading").first().hover();
    await pause();
    const answered = await style(first);
    expect(answered.background, "an answered dropdown fills").toBe(goldLight);
    expect(answered.border, "…with the gold edge").toBe(goldBorder);
    expect(answered.text, "…and the gold lettering").toBe(goldDark);

    // The city picker is typed into rather than picked from, and is a different
    // element with a different "answered" selector — so it gets its own pass
    // rather than being assumed to follow. Sitting inches from the dropdown
    // above, a field that missed the treatment would read as a different kind
    // of control, which is exactly what happened when it first shipped.
    const city = dialog.getByLabel(/^City/).first();
    await city.scrollIntoViewIfNeeded();

    const cityRest = await style(city);
    expect(cityRest.background, "an empty city field is not filled").toBe(surface);

    await city.hover();
    await pause();
    expect((await style(city)).border, "hover moves its edge to gold too").toBe(goldBorder);

    await city.fill("Coimbatore");
    await dialog.getByRole("heading").first().hover();
    await pause();
    const cityFilled = await style(city);
    expect(cityFilled.background, "a filled city fills like an answered dropdown").toBe(goldLight);
    expect(cityFilled.border, "…with the same edge").toBe(goldBorder);
    expect(cityFilled.text, "…and the same lettering").toBe(goldDark);

    // Emptying it gives the treatment back — the marker follows the value, not
    // a one-way flag set on first input.
    await city.fill("");
    await dialog.getByRole("heading").first().hover();
    await pause();
    expect((await style(city)).background, "clearing it empties the fill").toBe(surface);
  });
}

/**
 * City is searchable AND pick-only (client, 2026-08-19): neither a native
 * `<select>` (tried first) nor a `ComboField` datalist (tried second, but its
 * suggestion panel cannot be styled at all) gave both, so it is now
 * `SearchSelectField` — a hand-built combobox with its own styled listbox.
 * The restriction is enforced by validation, not by what can be typed:
 * anything not an exact match from the list is rejected on submit.
 */
for (const form of FORMS) {
  test(`${form.name}: city opens a styled, searchable list of options`, async ({ page }) => {
    const dialog = await openForm(page, form);
    const field = dialog.getByRole("combobox", { name: /^City/ });
    await field.scrollIntoViewIfNeeded();
    await field.click();

    const listbox = dialog.getByRole("listbox");
    await expect(listbox).toBeVisible();
    for (const city of ["Mumbai", "Bengaluru", "Coimbatore", "Varanasi"]) {
      await expect(listbox.getByRole("option", { name: city, exact: true })).toBeVisible();
    }

    // Typing filters the list down, rather than just widening what a plain
    // datalist would have suggested.
    await field.fill("Coim");
    await expect(listbox.getByRole("option", { name: "Coimbatore" })).toBeVisible();
    await expect(listbox.getByRole("option", { name: "Mumbai" })).not.toBeVisible();

    await listbox.getByRole("option", { name: "Coimbatore" }).click();
    await expect(field).toHaveValue("Coimbatore");

    // Says what to do about a town the list forgot.
    await expect(dialog.getByText(/Select a nearest city within your state/)).toBeVisible();
  });

  test(`${form.name}: a city not on the list is cleared, not silently kept`, async ({ page }) => {
    // The restriction lives in the field itself now, not only in the
    // schema — leaving unmatched text in the box would look like a real,
    // held answer right up until submit rejected it.
    const dialog = await openForm(page, form);
    const field = dialog.getByRole("combobox", { name: /^City/ });

    await field.fill("Kodaikanal");
    await field.blur();
    await expect(field).toHaveValue("");

    await dialog.locator('button[type="submit"]').last().click();
    await expect(dialog.getByText(/Select a city from the list/)).toBeVisible();
  });
}

/**
 * State is pick-only too (client, 2026-08-19 — same change as City above, on
 * the same request). A real `<select>`, restricted to every Indian state: no
 * off-list value can reach the form at all.
 */
for (const form of FORMS) {
  test(`${form.name}: state is a real select, restricted to the list`, async ({ page }) => {
    const dialog = await openForm(page, form);
    const field = dialog.getByLabel(/^State$/).first();
    await field.scrollIntoViewIfNeeded();

    expect(await field.evaluate((el) => el.tagName), "State is a select").toBe("SELECT");

    const options = await field.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((option) => option.value),
    );
    for (const place of ["Maharashtra", "Kerala", "Ladakh", "Puducherry"]) {
      expect(options, `State offers ${place}`).toContain(place);
    }

    await field.selectOption("Maharashtra");
    expect(await field.inputValue(), "State holds the picked value").toBe("Maharashtra");
  });

  test(`${form.name}: an unpicked state is rejected, not silently allowed through`, async ({ page }) => {
    const dialog = await openForm(page, form);
    await dialog.locator('button[type="submit"]').last().click();

    await expect(dialog.getByText(/Select a state from the list/)).toBeVisible();
  });
}

/**
 * A rejected field looks rejected, and keeps looking rejected.
 *
 * First name, not City or State: both became real `<select>`s (client,
 * 2026-08-19) and can no longer receive a stray space at all — this failure
 * mode only exists for a free-text field, which First name still is.
 *
 * Every other field in this file paints the control gold, and the error rules
 * are the weakest selectors in the recipe — so the error is the one treatment
 * that can be quietly outranked. Two ways it was:
 *
 *   · a field holding a single space reads as filled and fails `.trim()`, so it
 *     wore "this is your answer" while the message underneath said it was not;
 *   · `bg-red-light` tied with the tone's own fill and lost, so every rejected
 *     field on the site drew a red edge around an unchanged white box.
 *
 * Both were invisible to any assertion on class lists, and to anyone reading
 * the recipe, since the classes are all present and correct.
 */
for (const form of FORMS) {
  test(`${form.name}: a rejected field looks rejected`, async ({ page }) => {
    const dialog = await openForm(page, form);
    const pause = () => page.waitForTimeout(300);

    const { red, redLight } = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const resolve = (name: string) => {
        const probe = document.createElement("span");
        probe.style.color = root.getPropertyValue(name).trim();
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      return { red: resolve("--color-red"), redLight: resolve("--color-red-light") };
    });

    const firstName = dialog.getByLabel(/^First name/).first();
    // A single space: truthy, so the field reads as filled, and `.trim().min(1)`
    // rejects it. Exactly where "answered" and "wrong" collide.
    await firstName.fill(" ");
    await dialog.locator('button[type="submit"]').last().click();
    await expect(dialog.getByText(/First name is required/)).toBeVisible();

    await firstName.scrollIntoViewIfNeeded();
    const rejected = await style(firstName);
    expect(rejected.border, "a rejected field takes the error edge").toBe(red);
    expect(rejected.background, "…and the error fill, not the plain one").toBe(redLight);

    // The two states that used to erase it.
    await firstName.hover();
    await pause();
    expect((await style(firstName)).border, "hovering a rejected field does not gild it").toBe(red);

    await firstName.focus();
    await pause();
    expect((await style(firstName)).border, "focusing it keeps the error edge").toBe(red);

    // The message is tied to the control, not just sitting near it.
    const describedBy = await firstName.getAttribute("aria-describedby");
    expect(describedBy, "the error is announced, not only coloured").toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText(/First name is required/);
  });
}

/**
 * Where the treatment above comes from, asserted rather than described.
 *
 * The waitlist's "Who is this for?" buttons already answered "what does hover
 * mean, and what does chosen mean" for this form. The dropdowns borrow their
 * answer, so restyling the buttons must move the dropdowns too — and this is
 * what fails if the two are ever allowed to drift apart.
 */
test("the waitlist dropdown matches the pick-one buttons above it", async ({ page }) => {
  const dialog = await openForm(page, FORMS[0]);
  const pause = () => page.waitForTimeout(300);

  const group = dialog.getByRole("button", { name: /Group \(register as SPOC\)/ });
  const other = dialog.getByRole("button", { name: /Organisations & Institutions/ });
  const select = dialog.locator("select").first();

  await group.hover();
  await pause();
  const buttonHovered = await style(group);

  await group.click();
  await other.hover(); // pointer off, so this is the chosen state alone
  await pause();
  const buttonChosen = await style(group);

  await select.scrollIntoViewIfNeeded();
  await select.hover();
  await pause();
  expect((await style(select)).border, "hover borrows the buttons' hover edge").toBe(
    buttonHovered.border,
  );

  const answer = await select.evaluate(
    (el: HTMLSelectElement) => [...el.options].find((option) => option.value !== "")!.value,
  );
  await select.selectOption(answer);
  await dialog.getByRole("heading").first().hover();
  await pause();
  const answered = await style(select);
  expect(answered.background, "answering borrows the buttons' chosen fill").toBe(
    buttonChosen.background,
  );
  expect(answered.border, "…their edge").toBe(buttonChosen.border);
  expect(answered.text, "…and their lettering").toBe(buttonChosen.text);
});
