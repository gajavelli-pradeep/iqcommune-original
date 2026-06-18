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
    // "Investment Basics" is the first module in MODULES — "Mutual Funds" was never in the schema
    const btn = page.getByRole("button", { name: /investment basics/i });
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
    // Mock matches the real API response shape: { id, refCode }
    await context.route("/api/applications", (route) =>
      route.fulfill({ status: 201, body: JSON.stringify({ id: "prac_001", refCode: "IQC-EMP-0001" }) })
    );

    await page.fill('input[placeholder="Priya"]', "Priya");
    await page.fill('input[placeholder="Sharma"]', "Sharma");
    await page.fill('input[type="email"]', "priya@gmail.com");
    await page.fill('input[placeholder="+91 98765 43210"]', "+91 98765 43210");
    await page.fill('input[placeholder="Certified Financial Planner"]', "CFP");
    await page.fill('input[placeholder="Mumbai"]', "Mumbai");
    await page.selectOption('select:has-text("Select range")', { label: "5 – 8 years" });
    await page.click('button:has-text("Stock Market Basics")');
    await page.selectOption('select:has-text("Select frequency")', { label: "Once a month" });
    await page.fill("textarea", "I want to share my knowledge and give back.");

    // Use getByRole for checkboxes — :near() is not a native Playwright selector
    await page.getByRole("checkbox", { name: /iqcommune may disclose/i }).check();
    await page.getByRole("checkbox", { name: /cross-sell/i }).check();
    await page.getByRole("checkbox", { name: /employer/i }).check();

    await page.click("button[type=submit]");
    await expect(page.getByText(/application received/i)).toBeVisible({ timeout: 5000 });
    // Confirm success screen replaced the form (submit button is gone)
    await expect(page.locator("button[type=submit]")).not.toBeVisible();
  });

  test("duplicate email shows 409 error message", async ({ page, context }) => {
    await context.route("/api/applications", (route) =>
      route.fulfill({
        status: 409,
        body: JSON.stringify({ error: "An application with this email already exists" }),
      })
    );

    await page.fill('input[placeholder="Priya"]', "Priya");
    await page.fill('input[placeholder="Sharma"]', "Sharma");
    await page.fill('input[type="email"]', "existing@gmail.com");
    await page.fill('input[placeholder="+91 98765 43210"]', "+91 98765 43210");
    await page.fill('input[placeholder="Certified Financial Planner"]', "CFP");
    await page.fill('input[placeholder="Mumbai"]', "Mumbai");
    await page.selectOption('select:has-text("Select range")', { label: "5 – 8 years" });
    await page.click('button:has-text("Stock Market Basics")');
    await page.selectOption('select:has-text("Select frequency")', { label: "Once a month" });
    await page.fill("textarea", "I want to share my knowledge.");
    await page.getByRole("checkbox", { name: /iqcommune may disclose/i }).check();
    await page.getByRole("checkbox", { name: /cross-sell/i }).check();
    await page.getByRole("checkbox", { name: /employer/i }).check();

    await page.click("button[type=submit]");
    await expect(
      page.getByText(/application with this email already exists/i)
    ).toBeVisible({ timeout: 5000 });
    // Form should still be visible (not replaced by success screen)
    await expect(page.locator("button[type=submit]")).toBeVisible();
  });
});
