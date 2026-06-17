import { test, expect } from "@playwright/test";

test.describe("Admin auth guard", () => {
  test("unauthenticated access to /console redirects to /login", async ({ page }) => {
    await page.goto("/console");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("iqcommune")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("invalid credentials shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "wrong@example.com");
    await page.fill("#password", "wrongpassword");
    await page.click("button[type=submit]");
    await expect(page.getByRole("alert")).toContainText("Invalid credentials");
  });

  test("authenticated user at /login is redirected to /console", async ({ page, context }) => {
    // This test only runs if a valid Supabase session cookie is pre-seeded.
    // In CI, set SUPABASE_TEST_SESSION env var — skip if not provided.
    test.skip(!process.env.SUPABASE_TEST_SESSION, "Requires SUPABASE_TEST_SESSION");
    await context.addCookies(JSON.parse(process.env.SUPABASE_TEST_SESSION!));
    await page.goto("/login");
    await expect(page).toHaveURL(/\/console/);
  });
});
