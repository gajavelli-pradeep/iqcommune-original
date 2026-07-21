import { test, expect, type Page } from "@playwright/test";

/**
 * Content parity across breakpoints.
 *
 * The rule: anything a desktop viewer can see or do must still be reachable on a
 * phone. Responsive design relocates, collapses, or scrolls content — it never
 * deletes it. A `display: none` inside a `max-width` media query is only legal
 * when the same affordance exists somewhere else at that width (typically the
 * hamburger drawer).
 *
 * So the phone pass opens the drawer before collecting: an action that moved
 * into the drawer is relocated (fine), one that exists nowhere is deleted (bug).
 *
 * Decorative text is out of scope — this compares **interactive affordances and
 * headings**, the things a user can act on or navigate by.
 */

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 375, height: 812 };

const PUBLIC = ["/", "/practitioners", "/status", "/login", "/global-login"];
const TABS = ["practitioners", "requests", "sessions", "consent", "photos",
              "payouts", "agreements", "gallery", "settings", "activity"];

/**
 * Affordances that are legitimately desktop-only because the phone has a native
 * equivalent, or that carry no user-facing action. Every entry is a decision,
 * not a silencer — keep the reason with it.
 */
const ALLOWED_DESKTOP_ONLY = [
  /^skip to/i,          // skip-link: keyboard-only, irrelevant on touch
  /^\s*$/,              // icon-only control whose label lives in aria-label
  // Gallery paging dots: one per slide, and the slide count is whatever
  // /api/gallery returned (1 today) versus the 7 placeholders shown until it
  // resolves. That varies with fetch timing, not with viewport, so it cannot
  // measure parity. The paging affordances that DO matter — "Previous slide",
  // "Next slide", and touch swipe — are compared and present at both widths.
  /^Go to slide \d+$/,
  // Header brand strapline. Judgment call, deliberately narrow: it is decoration
  // inside the logo lockup, not an affordance or information the reader needs, and
  // it is hidden below 600px precisely to stop the header overflowing — which was
  // itself a P1. Trading a readable header for a strapline is the wrong trade.
  // Scoped to this exact string so any OTHER hidden copy still fails.
  /^Where financial intelligence connects$/,
];

async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

/** Open every collapsed shell (hamburger / drawer) so relocated actions count as present. */
async function revealMobileChrome(page: Page) {
  for (const sel of [".admin-hamburger", ".nav-hamburger", "[aria-label='Open menu']", "[aria-label='Menu']"]) {
    const el = page.locator(sel).first();
    if (await el.count() && await el.isVisible()) {
      await el.click();
      await page.waitForTimeout(450);
    }
  }
}

/**
 * Visible, actionable labels + headings — the things parity is measured on.
 *
 * Waits for the network to settle first: the home gallery renders 7 placeholder
 * slides until /api/gallery resolves to its 1 real photo, so snapshotting the two
 * viewports at different points in that fetch reported 6 phantom "missing" slides.
 */
async function affordances(page: Page): Promise<string[]> {
  await page.waitForLoadState("networkidle").catch(() => {});

  // Poll until the set stops changing. networkidle is not enough: a client fetch
  // that starts after hydration (the gallery) resolves later, and on a cold dev
  // server its route compiles on demand, so the two viewports were snapshotted at
  // different points in that swap.
  let previous = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.waitForTimeout(500);
    const current = JSON.stringify(await collect(page));
    if (current === previous) break;
    previous = current;
  }
  return collect(page);
}

/**
 * Everything a viewer can read or act on: interactive labels, headings, AND prose.
 *
 * Prose matters. An earlier version compared only controls and headings, and when
 * the /practitioners perks card was re-hidden to test the detector, the only thing
 * it could name was the "Show more" button — it caught that card by luck, because
 * the card happened to contain a control. A hidden block of pure copy or images
 * would have passed silently, which is the exact defect this file exists to catch.
 */
function collect(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const normalise = (s: string) => s.trim().replace(/\s+/g, " ");
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0";
    };

    const out: string[] = [];

    const controls = document.querySelectorAll(
      "button, a[href], select, input:not([type=hidden]), h1, h2, h3, [role=button], [role=tab]"
    );
    for (const el of Array.from(controls)) {
      if (!visible(el)) continue;
      const text = normalise(el.getAttribute("aria-label") || el.textContent || "");
      if (text) out.push(text.slice(0, 60));
    }

    // Prose: elements carrying their own text, not just inherited from children,
    // so a section counts once rather than at every level of its wrapper chain.
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      if (!visible(el)) continue;
      const own = normalise(
        Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent ?? "")
          .join(" ")
      );
      // Under ~15 chars is noise: counts, currency, dates, single glyphs — all of
      // which legitimately differ between two independently rendered viewports.
      if (own.length >= 15) out.push(own.slice(0, 60));
    }

    // Alt text is content too — an image dropped on mobile is content deleted.
    for (const img of Array.from(document.querySelectorAll("img[alt]"))) {
      if (!visible(img)) continue;
      const alt = normalise(img.getAttribute("alt") || "");
      if (alt) out.push(`[img] ${alt}`.slice(0, 60));
    }

    return Array.from(new Set(out));
  });
}

async function compare(page: Page, goTo: () => Promise<void>, label: string): Promise<string[]> {
  await page.setViewportSize(DESKTOP);
  await goTo();
  const wide = await affordances(page);

  await page.setViewportSize(PHONE);
  await goTo();
  await revealMobileChrome(page);
  const narrow = new Set(await affordances(page));

  const missing = wide.filter((a) => !narrow.has(a) && !ALLOWED_DESKTOP_ONLY.some((re) => re.test(a)));
  console.log(missing.length ? `FAIL ${label} — desktop-only: ${JSON.stringify(missing)}` : `ok   ${label}`);
  return missing;
}

test("public routes — nothing on desktop is missing on a phone", async ({ page }) => {
  test.setTimeout(300000);
  const failures: string[] = [];
  for (const route of PUBLIC) {
    const missing = await compare(page, () => page.goto(route).then(() => {}), `pub${route}`);
    if (missing.length) failures.push(`pub${route}: ${missing.join(" | ")}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("admin tabs — nothing on desktop is missing on a phone", async ({ page }) => {
  test.setTimeout(600000);
  await loginGlobalAdmin(page);
  const failures: string[] = [];
  for (const tab of TABS) {
    const missing = await compare(page, () => page.goto(`/globaladmin?tab=${tab}`).then(() => {}), `adm:${tab}`);
    if (missing.length) failures.push(`adm:${tab}: ${missing.join(" | ")}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
