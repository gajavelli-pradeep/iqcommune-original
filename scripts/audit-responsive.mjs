/**
 * Whole-site responsive and scroll audit.
 *
 * Checks the two failures that a screenshot at 1440px can never show:
 *   - the PAGE scrolling sideways (a table scrolling inside its own region is
 *     fine; the document is not), and
 *   - content that is unreachable because a height-constrained box has no
 *     scroll path.
 *
 * It also counts controls below the 44px touch floor, but only under a coarse
 * pointer — the hit-area expanders are inactive with a mouse, so a fine-pointer
 * measurement reports false failures.
 *
 * Usage: QA_PASSWORD=… node scripts/audit-responsive.mjs
 */
import { chromium } from "@playwright/test";

const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1600, 1920];

/**
 * Every page of the site, not just the openly reachable ones.
 *
 * The five emailed flow pages need a signed token, so they are passed in as
 * `PREVIEW_LINKS` — one `name path` pair per line, produced by
 * `mint-preview-tokens.mjs`. Auditing them through a mock harness would audit
 * the harness; these are the real pages with real rows behind them.
 */
const PUBLIC_PAGES = [
  { path: "/", name: "Landing" },
  { path: "/practitioners", name: "Practitioners" },
  { path: "/login", name: "Login" },
  ...(process.env.PREVIEW_LINKS ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(" ");
      return { name, path: rest.join(" ") };
    }),
];

const CONSOLE_TABS = [
  "practitioners",
  "agreements",
  "requests",
  "confirmations",
  "sessions",
  "photos",
  "payouts",
  "gallery",
  "settings",
  "activity",
];

/** Measures the page at its current size. */
const measure = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const pageScrolls = doc.scrollWidth > doc.clientWidth + 1;

    // A box with a constrained height and no scroll path hides its overflow.
    const trapped = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      // `sr-only` is a 1px clipped box BY DESIGN — its overflow is meant to be
      // invisible and is read by assistive tech, not scrolled to. Counting it
      // flags every page on the site and buries the real findings.
      if (String(el.className).includes("sr-only")) continue;
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") continue;
      if (style.overflowY === "visible") continue; // spills, but is reachable
      const box = el.getBoundingClientRect();
      if (box.height === 0) continue;

      // Clipping DECORATION is what overflow:hidden is for — a glow bleeding
      // past a hero, a ripple inside a radius. Only clipped CONTENT is a
      // defect, so this asks what is actually below the fold of the box:
      // anything with text or anything a person could focus.
      const clipped = [...el.querySelectorAll("*")].filter((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.bottom <= box.bottom + 1 || rect.height === 0) return false;
        const readable = (child.textContent ?? "").trim().length > 0;
        const focusable = child.matches("a[href], button, input, select, textarea, [tabindex]");
        return readable || focusable;
      });
      if (clipped.length === 0) continue;

      trapped.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
    }

    const tiny = [];
    for (const el of document.querySelectorAll("button, a[href], select, input, textarea")) {
      const box = el.getBoundingClientRect();
      if (!box.width && !box.height) continue;

      // A visually-hidden input is not the control — its <label> is (a styled
      // file picker, for one). Measuring the input reports a 1px failure for a
      // perfectly reachable button.
      if (box.width <= 2 || box.height <= 2) continue;

      // Checkbox and radio carry their tap area on the label that wraps them,
      // which is the documented reason they are exempt from the global floor.
      // So measure the label where there is one.
      let target = box;
      if (el.matches('input[type="checkbox"], input[type="radio"]')) {
        const label = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
        if (label) target = label.getBoundingClientRect();
      }

      const after = getComputedStyle(el, "::after");
      const height = Math.max(target.height, parseFloat(after.height) || 0);
      const width = Math.max(target.width, parseFloat(after.width) || 0);
      if (height < 44 || width < 44) {
        tiny.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 24));
      }
    }

    return { pageScrolls, trapped: [...new Set(trapped)].slice(0, 4), tiny: tiny.length };
  });

const browser = await chromium.launch();
const failures = [];

// ── Public pages ────────────────────────────────────────────────────────────
for (const target of PUBLIC_PAGES) {
  const line = [];
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 800,
      isMobile: width < 800,
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:3000${target.path}`, { waitUntil: "networkidle" });
    const result = await measure(page);

    if (result.pageScrolls) failures.push(`${target.name} @${width}: page scrolls sideways`);
    if (result.trapped.length) failures.push(`${target.name} @${width}: unreachable ${result.trapped.join(", ")}`);
    if (width < 800 && result.tiny) failures.push(`${target.name} @${width}: ${result.tiny} control(s) under 44px`);

    line.push(`${width}${result.pageScrolls || result.trapped.length ? "✗" : "·"}`);
    await context.close();
  }
  console.log(`${target.name.padEnd(15)} ${line.join(" ")}`);
}

// ── Console tabs ────────────────────────────────────────────────────────────
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill("qa.globaladmin@example.com");
await page.getByLabel(/password/i).first().fill(process.env.QA_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });
const cookies = await context.cookies();
await context.close();

for (const tab of CONSOLE_TABS) {
  const line = [];
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 800,
      isMobile: width < 800,
    });
    await ctx.addCookies(cookies);
    const view = await ctx.newPage();
    await view.goto("http://localhost:3000/globaladmin", { waitUntil: "networkidle" });
    await view.evaluate((id) => {
      const control = document.querySelector(`[data-tab="${id}"]`);
      if (control instanceof HTMLElement) control.click();
    }, tab);
    await view.waitForTimeout(300);

    const result = await measure(view);
    if (result.pageScrolls) failures.push(`console/${tab} @${width}: page scrolls sideways`);
    if (result.trapped.length) failures.push(`console/${tab} @${width}: unreachable ${result.trapped.join(", ")}`);
    if (width < 800 && result.tiny) failures.push(`console/${tab} @${width}: ${result.tiny} control(s) under 44px`);

    line.push(`${width}${result.pageScrolls || result.trapped.length ? "✗" : "·"}`);
    await ctx.close();
  }
  console.log(`console/${tab.padEnd(15)} ${line.join(" ")}`);
}

console.log(
  failures.length ? `\n${failures.length} FAILURE(S):\n  ${failures.join("\n  ")}` : "\nno failures",
);
await browser.close();
