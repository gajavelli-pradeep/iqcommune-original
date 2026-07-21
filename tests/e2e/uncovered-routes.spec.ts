import { test, expect } from "@playwright/test";

import { auditPage, contrastFailures } from "./audit";

/**
 * The routes that had no browser coverage at all — F3 in the flaw ledger.
 *
 * This exists because a green suite was being read as "the fixes work" when the
 * suite did not visit the pages most of those fixes touched. `/submit-photos`,
 * `/onboarding` and `/join-admin` absorbed eight structural changes between
 * them without ever being rendered.
 *
 * Every page is visited in the state a stranger reaches it in: no token for the
 * link pages, no session for the console.
 */

const LINK_PAGES = [
  { path: "/submit-photos", name: "post-session photos" },
  { path: "/onboarding", name: "onboarding" },
  { path: "/join-admin", name: "account setup" },
];

const CONSOLE_ROUTES = ["/user", "/console", "/globaladmin"];

const TIERS = [
  { w: 320, h: 640, name: "320 small mobile" },
  { w: 768, h: 1024, name: "768 tablet" },
  { w: 1440, h: 900, name: "1440 desktop" },
  { w: 640, h: 320, name: "640x320 landscape phone" },
];

for (const page_ of LINK_PAGES) {
  test.describe(page_.path, () => {
    test("explains an unusable link rather than rendering a form", async ({ page }) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(String(error)));

      await page.goto(page_.path);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main").getByRole("button")).toHaveCount(0);
      expect(problems, problems.join("\n")).toEqual([]);
    });

    test("meets AA contrast", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(page_.path);
      const failures = await contrastFailures(page);
      expect(failures, failures.map((f) => `${f.ratio}:1 — ${f.text}`).join("\n")).toEqual([]);
    });

    for (const tier of TIERS) {
      test(`holds together at ${tier.name}`, async ({ page }) => {
        await auditPage(page, page_.path, tier.w, tier.h);
      });
    }
  });
}

test.describe("console routes without a session", () => {
  for (const route of CONSOLE_ROUTES) {
    test(`${route} refuses an unauthenticated visitor`, async ({ page }) => {
      const response = await page.goto(route);

      // Whatever it does, it must not render a console. Redirecting to a login
      // that does not exist is its own defect, and this is where it surfaces.
      await expect(page.getByRole("navigation", { name: "Console sections" })).toHaveCount(0);
      expect(response?.status(), `${route} returned ${response?.status()}`).toBeLessThan(500);
    });
  }
});
