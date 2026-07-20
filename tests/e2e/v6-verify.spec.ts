import { test, expect, type Page } from "@playwright/test";

// V6 verification harness (throwaway) — drives the real running app to confirm the
// V6 clone works, not just renders. Run targeted: `npx playwright test v6-verify --grep P1`.

const SHOTS = process.env.V6_SHOT_DIR ?? "v6-shots";

async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 20000 });
}

async function openTab(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label }).first().click();
}

test.describe("V6", () => {
  test("P1 — admin top nav fits at 375px (no clip / no h-scroll)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin");
    await page.waitForTimeout(600);

    const hScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    const consoleDisplay = await page
      .locator(".admin-nav-console")
      .first()
      .evaluate((el) => getComputedStyle(el).display);
    const searchDisplay = await page
      .locator(".admin-nav-search")
      .evaluate((el) => getComputedStyle(el).display);
    // The right cluster (bell + avatar) must sit fully inside the viewport, not clipped.
    const avatarRight = await page
      .locator(".admin-topnav")
      .evaluate((nav) => {
        const kids = nav.querySelectorAll("*");
        let max = 0;
        kids.forEach((k) => { max = Math.max(max, k.getBoundingClientRect().right); });
        return Math.round(max);
      });

    await page.screenshot({ path: `${SHOTS}/p1-nav-375.png` });
    expect(hScroll, "no horizontal body scroll at 375px").toBe(false);
    expect(consoleDisplay, "'Admin Console' lockup hidden ≤600px").toBe("none");
    expect(searchDisplay, "search box hidden ≤600px").toBe("none");
    expect(avatarRight, "right cluster fully inside 375px viewport").toBeLessThanOrEqual(376);
  });

  test("§10 — admin can upload photos directly for a pending session", async ({ page }) => {
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin");
    await openTab(page, /^Photos/);
    const uploadBtn = page.getByRole("button", { name: "Upload", exact: true }).first();
    await expect(uploadBtn, "Upload action present on a pending row").toBeVisible({ timeout: 10000 });
    await uploadBtn.click();

    // Minimal valid 1x1 PNG (correct magic bytes for the server-side MIME check).
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const respP = page.waitForResponse((r) => r.url().includes("/api/admin/photos/upload"), { timeout: 20000 });
    await page.locator('input[type=file][accept*="png"]').setInputFiles({ name: "v6-test.png", mimeType: "image/png", buffer: png });
    const resp = await respP;
    const body = await resp.json().catch(() => ({}));
    expect(resp.status(), `upload responded ok (body: ${JSON.stringify(body)})`).toBe(200);
    expect(body.ok).toBe(true);
    console.log("ADMIN_UPLOAD_SUBMISSION_ID=" + body.id);
  });

  test("§3 — rating request: editable preview + 15s undo cancels the send", async ({ page }) => {
    test.setTimeout(70000);
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin");
    await openTab(page, /Session Details/);

    let ratingPosts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && /\/rating-request$/.test(r.url())) ratingPosts++;
    });

    const sendBtn = page.getByRole("button", { name: "Send email" }).first();
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();

    // Editable preview opens (GET prefilled the draft).
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 12000 });
    await expect(modal.getByText("Send rating request")).toBeVisible();
    const editables = modal.locator('[contenteditable="true"]');
    await expect(editables.first(), "subject/body are contenteditable").toBeVisible();
    const editableCount = await editables.count();
    expect(editableCount, "subject + body both editable").toBeGreaterThanOrEqual(2);

    await modal.getByRole("button", { name: "Click to send" }).click();

    // 15s undo toast appears, then Undo cancels.
    await expect(page.getByText(/sending in \d+s/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Undo" }).click();

    // Past the 15s window, the send must NOT have fired.
    await page.waitForTimeout(16000);
    expect(ratingPosts, "Undo cancelled the send — no POST fired").toBe(0);
    await page.screenshot({ path: `${SHOTS}/s3-rating-undo.png` });
  });

  test("responsive — rate page has no horizontal scroll at 320px (stars fit)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const token = "5fc2a83338368420005fb49852a884a1d3dd693818c6d56fc6c9761120ecdde2";
    await page.goto(`/rate?ref=IQC-SES-0008&token=${token}`);
    await page.waitForTimeout(500);
    const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.screenshot({ path: `${SHOTS}/rate-320.png` });
    expect(hScroll, "no horizontal scroll on the rate page at 320px").toBe(false);
  });

  test("responsive — send-preview modal footer buttons stay inside 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await loginGlobalAdmin(page);
    // At 375px the sidebar is an off-canvas drawer — navigate to the tab by URL param.
    await page.goto("/globaladmin?tab=sessions");
    await page.getByRole("button", { name: "Send email" }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 12000 });
    // Every footer button must sit fully within the 375px viewport (not clipped).
    const maxRight = await modal.evaluate((m) => {
      let max = 0;
      m.querySelectorAll("button").forEach((b) => { max = Math.max(max, b.getBoundingClientRect().right); });
      return Math.round(max);
    });
    await page.screenshot({ path: `${SHOTS}/modal-375.png` });
    expect(maxRight, "no modal button clipped past 375px").toBeLessThanOrEqual(375);
  });

  test("P1 — admin top nav at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin");
    await page.waitForTimeout(600);
    const hScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    await page.screenshot({ path: `${SHOTS}/p1-nav-320.png` });
    expect(hScroll, "no horizontal body scroll at 320px").toBe(false);
  });
});
