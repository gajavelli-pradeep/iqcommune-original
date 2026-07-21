import { test, expect } from "@playwright/test";

import { auditPage, contrastFailures } from "./audit";

/**
 * Browser pass over the tokenised pages.
 *
 * Both are visited *without* a token, which is the state a real visitor hits
 * most often — an expired link, a truncated one, a forwarded one — and the one
 * the spec never drew. If it is broken, it is broken for everybody who arrives
 * late.
 */

const PAGES = [
  { path: "/rate", badge: "Session Feedback", title: /This link isn't complete/ },
  { path: "/consent", badge: "Session Consent", title: /This link isn't complete/ },
];

const TIERS = [
  { w: 320, h: 640, name: "320 small mobile" },
  { w: 1440, h: 900, name: "1440 desktop" },
  { w: 640, h: 320, name: "640x320 landscape phone" },
];

for (const target of PAGES) {
  test.describe(target.path, () => {
    test("explains an unusable link instead of rendering a form", async ({ page }) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(String(error)));

      await page.goto(target.path);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(target.title);
      // The form must not exist without a verified token. Scoped to <main>:
      // Next's dev-mode overlay adds its own button once hydration settles, and
      // asserting over the whole page makes this flake on timing.
      await expect(page.locator("main").getByRole("button")).toHaveCount(0);
      expect(problems, problems.join("\n")).toEqual([]);
    });

    test("is not indexable", async ({ page }) => {
      const response = await page.goto(target.path);
      expect(response?.headers()["x-robots-tag"] ?? (await page.locator('meta[name="robots"]').getAttribute("content")))
        .toContain("noindex");
    });

    test("meets AA contrast", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(target.path);
      const failures = await contrastFailures(page);
      expect(failures, failures.map((f) => `${f.ratio}:1 — ${f.text}`).join("\n")).toEqual([]);
    });

    for (const tier of TIERS) {
      test(`holds together at ${tier.name}`, async ({ page }) => {
        await auditPage(page, target.path, tier.w, tier.h);

        const note = page.getByText(/Confidential · Questions\?/);
        await note.scrollIntoViewIfNeeded();
        await expect(note).toBeInViewport();
      });
    }
  });
}
