import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', process.env.ADMIN_EMAIL ?? "admin@iqcommune.in");
  await page.fill('[name="password"]', process.env.ADMIN_PASSWORD ?? "");
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/console", { timeout: 10000 });
});

test("console shows practitioner pipeline section", async ({ page }) => {
  await expect(page.locator("text=Practitioner pipeline")).toBeVisible();
});

test("console shows session requests section", async ({ page }) => {
  await expect(page.locator("text=Session Requests")).toBeVisible();
});

test("console shows payouts section", async ({ page }) => {
  await expect(page.locator("text=Payouts")).toBeVisible();
});

test("console stats cards are visible", async ({ page }) => {
  // Four KPI stat cards should be present
  await expect(page.locator("text=Applied")).toBeVisible();
  await expect(page.locator("text=Empanelled")).toBeVisible();
});

test("unauthenticated access redirects to login", async ({ page, context }) => {
  // Open fresh context to get no session
  const freshPage = await context.newPage();
  await context.clearCookies();
  await freshPage.goto("/console");
  await expect(freshPage).toHaveURL("/login");
  await freshPage.close();
});
