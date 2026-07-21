import { test, expect, type Page } from "@playwright/test";

/**
 * Container-level overflow audit.
 *
 * `v6-responsive-full.spec.ts` catches content that escapes the *viewport*. This
 * catches the other half — content that escapes its own **card** while the page
 * itself stays 375px wide, which is how the Team & Access table shipped broken:
 * a 640px table inside a 318px bordered card whose wrapper said
 * `overflow-x: visible`, so the rows drew straight over the border.
 *
 * A box is a defect when it extends past the padding box of its nearest
 * width-constrained ancestor and nothing in between either scrolls
 * (`overflow-x: auto|scroll`) or clips (`hidden|clip`) it.
 *
 * This spec ASSERTS. `v6-responsive-full` only console.logs "FAIL", so a green
 * run there proves nothing; a regression here turns the suite red.
 */

const TIERS = [320, 375, 768, 1440];
const SHORT = { w: 640, h: 320 };

const PUBLIC = ["/", "/practitioners", "/status", "/login", "/global-login",
                "/join-admin", "/onboarding", "/consent", "/submit-photos", "/rate"];
const TABS = ["practitioners", "requests", "sessions", "consent", "photos",
              "payouts", "agreements", "gallery", "settings", "activity"];

/** Slack (px) — sub-pixel layout rounding and 1px borders are not defects. */
const SLACK = 2;

async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

type Offender = { el: string; overhang: number; container: string; text: string };

async function scanContainers(page: Page, label: string, slack: number): Promise<Offender[]> {
  await page.waitForTimeout(450);
  const offenders = await page.evaluate((slackPx) => {
    const describe = (el: Element) => {
      const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "";
      return el.tagName.toLowerCase() + cls;
    };

    const out: { el: string; overhang: number; container: string; text: string }[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      if (getComputedStyle(el).position === "fixed") continue; // anchored to the viewport, not a container

      // Walk up to the nearest ancestor that constrains width, noting whether
      // anything on the way scrolls or clips this element.
      let handled = false;
      let container: HTMLElement | null = null;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        const ox = cs.overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") { handled = true; break; }
        // A block-level ancestor narrower than the element is the box it must fit.
        const pb = p.getBoundingClientRect();
        if (pb.width >= 1 && pb.right + slackPx < box.right) { container = p; break; }
      }
      if (handled || !container) continue;

      // Only report against a container that reads as a surface — one with a
      // border or its own background. A bare layout div overflowing is normal flow.
      const cs = getComputedStyle(container);
      const hasEdge = parseFloat(cs.borderRightWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0
        || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent")
        || cs.borderRadius !== "0px";
      if (!hasEdge) continue;

      out.push({
        el: describe(el),
        overhang: Math.round(box.right - container.getBoundingClientRect().right),
        container: describe(container),
        text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
      });
    }

    // One line per (element, container) pair — a 5-row table would otherwise
    // report the same defect five times.
    const seen = new Set<string>();
    return out.filter((o) => {
      const k = `${o.el}>${o.container}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, slack);

  if (offenders.length) {
    console.log(`FAIL ${label}`);
    for (const o of offenders) console.log(`     ${o.el} overhangs ${o.container} by ${o.overhang}px — "${o.text}"`);
  } else {
    console.log(`ok   ${label}`);
  }
  return offenders;
}

test("public routes — content stays inside its card", async ({ page }) => {
  test.setTimeout(600000);
  const failures: string[] = [];
  for (const w of [...TIERS, SHORT.w]) {
    await page.setViewportSize({ width: w, height: w === SHORT.w ? SHORT.h : 900 });
    for (const route of PUBLIC) {
      await page.goto(route);
      const bad = await scanContainers(page, `pub${route}@${w}`, SLACK);
      if (bad.length) failures.push(`pub${route}@${w}: ${bad.map((b) => `${b.el}>${b.container}+${b.overhang}px`).join(", ")}`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("admin tabs — content stays inside its card", async ({ page }) => {
  test.setTimeout(900000);
  await loginGlobalAdmin(page);
  const failures: string[] = [];
  for (const w of [...TIERS, SHORT.w]) {
    await page.setViewportSize({ width: w, height: w === SHORT.w ? SHORT.h : 900 });
    for (const tab of TABS) {
      await page.goto(`/globaladmin?tab=${tab}`);
      const bad = await scanContainers(page, `adm:${tab}@${w}`, SLACK);
      if (bad.length) failures.push(`adm:${tab}@${w}: ${bad.map((b) => `${b.el}>${b.container}+${b.overhang}px`).join(", ")}`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
