import { test, expect } from "@playwright/test";

test.describe("Practitioner application flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practitioners");
  });

  test("page renders application heading and form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /apply to join/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /share what you know/i })).toBeVisible();
  });

  test("form shows validation errors on empty submit", async ({ page }) => {
    await page.click("button[type=submit]");
    await expect(page.getByText(/first name/i).first()).toBeVisible();
  });

  test("module toggle selects and deselects", async ({ page }) => {
    const btn = page.getByRole("button", { name: /mutual funds/i });
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveCSS("background-color", "rgb(15, 17, 23)");
    await btn.click();
    await expect(btn).not.toHaveCSS("background-color", "rgb(15, 17, 23)");
  });

  test("family payment section reveals on checkbox", async ({ page }) => {
    const checkbox = page.getByRole("checkbox", { name: /family member/i });
    await expect(page.getByPlaceholder(/full name/i)).not.toBeVisible();
    await checkbox.check();
    await expect(page.getByPlaceholder(/full name/i)).toBeVisible();
  });

  test("successful submission shows confirmation screen", async ({ page, context }) => {
    // Mock the API to return 200 so we don't need a real Supabase connection
    await context.route("/api/applications", (route) =>
      route.fulfill({ status: 201, body: JSON.stringify({ success: true }) })
    );

    await page.fill('input[placeholder="Priya"]', "Priya");
    await page.fill('input[placeholder="Sharma"]', "Sharma");
    await page.fill('input[type="email"]', "priya@gmail.com");
    await page.fill('input[placeholder="+91 98765 43210"]', "+91 98765 43210");
    await page.fill('input[placeholder="Certified Financial Planner"]', "CFP");
    await page.fill('input[placeholder="Mumbai"]', "Mumbai");
    await page.selectOption('select:has-text("Select range")', { label: /3 – 5 years/ });
    await page.click('button:has-text("Stock Market Basics")');
    await page.selectOption('select:has-text("Select frequency")', { label: /Once/ });
    await page.fill("textarea", "I want to share my knowledge and give back.");
    await page.check('input[type=checkbox]:near(:text("iqcommune may disclose"))');
    await page.check('input[type=checkbox]:near(:text("cross-sell"))');
    await page.check('input[type=checkbox]:near(:text("employer"))');

    await page.click("button[type=submit]");
    await expect(page.getByText(/application received/i)).toBeVisible({ timeout: 5000 });
  });
});
