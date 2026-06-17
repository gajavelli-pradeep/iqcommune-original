import { test, expect } from "@playwright/test";

const MOCK_ONBOARDING_URL =
  "/onboarding?name=Vikram%20Kulkarni&role=Equity%20Analyst&org=Motilal&module=Stock%20Market%20Basics&city=Mumbai&ref=0042&sig=mock_sig";

test.describe("Agreement signing flow", () => {
  test("onboarding page renders agreement and practitioner name", async ({ page }) => {
    await page.goto(MOCK_ONBOARDING_URL);
    await expect(page.getByText(/practitioner empanelment agreement/i).first()).toBeVisible();
    await expect(page.getByText(/Vikram/)).toBeVisible();
  });

  test("signature section is locked until agreement is scrolled", async ({ page }) => {
    await page.goto(MOCK_ONBOARDING_URL);
    // Signature form should not be visible before scrolling
    await expect(page.getByRole("heading", { name: /sign the agreement/i })).not.toBeVisible();
    // Scroll the agreement text to the bottom
    const scrollArea = page.locator(
      "div[style*='overflow-y: auto']"
    ).first();
    await scrollArea.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByRole("heading", { name: /sign the agreement/i })).toBeVisible({
      timeout: 2000,
    });
  });

  test("type-signature mode shows text input", async ({ page }) => {
    await page.goto(MOCK_ONBOARDING_URL);
    const scrollArea = page.locator("div[style*='overflow-y: auto']").first();
    await scrollArea.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByRole("heading", { name: /sign the agreement/i })).toBeVisible({
      timeout: 2000,
    });
    await page.click("button:has-text('Type signature')");
    await expect(page.getByPlaceholder(/type your full name/i)).toBeVisible();
  });

  test("successful signing shows confirmation with ref code", async ({ page, context }) => {
    await context.route("/api/onboarding/sign", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          refCode: "IQC-EMP-0042",
          signedBy: "Vikram Kulkarni",
        }),
      })
    );

    await page.goto(MOCK_ONBOARDING_URL);
    const scrollArea = page.locator("div[style*='overflow-y: auto']").first();
    await scrollArea.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByRole("heading", { name: /sign the agreement/i })).toBeVisible({
      timeout: 2000,
    });

    await page.fill('input[placeholder]', "Vikram Kulkarni");
    // Fill designation (second input in signature section)
    const inputs = page.locator('form input:not([type=hidden])');
    await inputs.nth(1).fill("Equity Analyst");

    // Switch to type mode and sign
    await page.click("button:has-text('Type signature')");
    await page.fill('input[placeholder="Type your full name"]', "Vikram Kulkarni");

    await page.click("button[type=submit]");
    await expect(page.getByText(/agreement signed/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/IQC-EMP-0042/)).toBeVisible();
  });
});
