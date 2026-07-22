/**
 * Measures every form control in the React app and diffs it against V7.
 *
 * Companion to `measure-v7-controls.mjs`. Same properties, same method — focus
 * by actually focusing — so the two sets are comparable. It groups by the
 * control's role (public form field vs console inline editor) rather than by
 * class, because the class strings are what this work is removing.
 *
 * Usage:
 *   node scripts/measure-v7-controls.mjs > _parity/v7-controls.json
 *   QA_PASSWORD=… node scripts/audit-controls.mjs
 */
import { chromium } from "@playwright/test";
const PROPERTIES = [
  "backgroundColor",
  "color",
  "borderTopWidth",
  "borderTopColor",
  "borderRadius",
  "fontSize",
  "fontWeight",
  "paddingTop",
  "paddingLeft",
  "height",
];

/**
 * V7's two families, reduced to the numbers that define them. Taken from the
 * measurement, not from reading its CSS.
 */
const V7_FAMILIES = {
  "public form control": {
    backgroundColor: "rgb(255, 255, 255)",
    color: "rgb(15, 17, 23)",
    borderTopWidth: "1px",
    borderTopColor: "rgba(15, 17, 23, 0.2)",
    borderRadius: "8px",
    fontSize: "14px",
    paddingTop: "11px",
    paddingLeft: "14px",
  },
  "console inline editor": {
    backgroundColor: "rgb(248, 247, 244)",
    color: "rgb(15, 17, 23)",
    borderTopWidth: "1px",
    borderTopColor: "rgba(15, 17, 23, 0.18)",
    borderRadius: "8px",
    paddingTop: "9px",
    paddingLeft: "12px",
    focusBorder: "rgb(201, 152, 42)",
  },
};

const PUBLIC_ROUTES = ["/", "/practitioners", "/login"];
const CONSOLE_TABS = ["confirmations", "sessions", "payouts", "settings", "gallery"];

const measure = (page) =>
  page.evaluate(async (props) => {
    /**
     * The controls transition `border-color` over 150ms, and `getComputedStyle`
     * reports the value the element has RIGHT NOW — mid-interpolation, which at
     * the instant of `.focus()` is still the resting colour. Read it in the same
     * tick and every control looks as though its focus style never applied.
     * Settle past the transition before sampling.
     */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

    const results = [];
    for (const el of document.querySelectorAll("input, select, textarea")) {
      const box = el.getBoundingClientRect();
      if (box.width <= 2 && box.height <= 2) continue; // visually hidden
      // Not text-or-select controls: a checkbox carries its target on its
      // label, a range slider is its own V7 family (`.tw-range`), and a file
      // input is a styled label with the input visually hidden behind it.
      if (["checkbox", "radio", "file", "range"].includes(el.type)) continue;
      // The nav search is a borderless pill by design in both V7 and here. The
      // rest of the header is NOT exempt: "Viewing as" is a real select on the
      // inline family, and skipping the whole header once hid it from every
      // run — it was reported broken by hand while this script called it clean.
      if (el.type === "search" || el.closest("[data-audit-skip]")) continue;

      const style = getComputedStyle(el);
      const resting = {};
      for (const prop of props) resting[prop] = style[prop];

      let focusBorder = "";
      try {
        el.focus();
        await settle();
        focusBorder = getComputedStyle(el).borderTopColor;
        el.blur();
      } catch {
        /* ignore */
      }

      results.push({
        id: el.id || `${el.tagName.toLowerCase()}[${el.type ?? ""}]`,
        className: String(el.className).slice(0, 48),
        resting,
        focusBorder,
      });
    }
    return results;
  }, PROPERTIES);

/** Reports only the properties that differ from the family's definition. */
function diff(control, family) {
  const expected = V7_FAMILIES[family];
  const problems = [];
  for (const [prop, want] of Object.entries(expected)) {
    if (prop === "focusBorder") {
      if (control.focusBorder && control.focusBorder !== want) {
        problems.push(`focusBorder ${control.focusBorder} ≠ ${want}`);
      }
      continue;
    }
    const got = control.resting[prop];
    if (got && got !== want) problems.push(`${prop} ${got} ≠ ${want}`);
  }
  return problems;
}

const browser = await chromium.launch();
let offenders = 0;
let checked = 0;

// ── Public pages ────────────────────────────────────────────────────────────
for (const route of PUBLIC_ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });

  // Open the apply/request dialog so its fields are measurable.
  const opener = page.getByRole("button", { name: /apply|request a session/i }).first();
  if (await opener.count()) {
    await opener.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const found = await measure(page);
  for (const control of found) {
    checked += 1;
    const problems = diff(control, "public form control");
    if (problems.length) {
      offenders += 1;
      console.log(`${route} ${control.id}\n    ${problems.join("\n    ")}`);
    }
  }
  console.log(`  · ${route}: ${found.length} controls`);
  await page.close();
}

// ── Console ─────────────────────────────────────────────────────────────────
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await context.newPage();
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill("qa.globaladmin@example.com");
await page.getByLabel(/password/i).first().fill(process.env.QA_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

for (const tab of CONSOLE_TABS) {
  await page.evaluate((id) => {
    const control = document.querySelector(`[data-tab="${id}"]`);
    if (control instanceof HTMLElement) control.click();
  }, tab);
  await page.waitForTimeout(400);

  // The confirmation form only renders once a session is picked.
  const picker = page.locator("#confirm-session");
  if ((await picker.count()) && (await picker.locator("option").count()) > 1) {
    await picker.selectOption({ index: 1 });
    await page.waitForTimeout(400);
  }

  const found = await measure(page);
  let onTab = 0;
  for (const control of found) {
    // The search box is a borderless pill in V7 too, so it has no family here.
    // "Viewing as" used to be skipped alongside it — it is not chrome, it is an
    // inline-family select, and exempting it is how a real styling bug on it
    // survived a clean run of this script.
    if (["menu-search"].includes(control.id)) continue;
    checked += 1;
    onTab += 1;
    const problems = diff(control, "console inline editor");
    if (problems.length) {
      offenders += 1;
      console.log(`console/${tab} #${control.id}\n    ${problems.join("\n    ")}`);
    }
  }
  console.log(`  · console/${tab}: ${onTab} controls — ${found.map((c) => c.id).join(", ")}`);
}

await browser.close();
console.log(`\n${offenders} of ${checked} controls differ from the V7 family they belong to`);
