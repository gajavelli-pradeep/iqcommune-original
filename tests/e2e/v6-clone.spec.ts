import { test, type Page } from "@playwright/test";
import * as path from "path";

// Throwaway V6 clone-verification harness. Screenshots live admin tabs + the mockup
// so the rebuild can be visually diffed. Drive: SHOT=<dir> TAB=<key> npx playwright test v6-clone --grep <name>
const SHOTS = process.env.V6_SHOT_DIR ?? path.resolve(process.cwd(), "..", "v6-clone-shots");
const MOCKUP = "file://" + path.resolve(process.cwd(), "..", "client_requirements", "completelyautomatedsetup (V6)", "iqcommune-admin-console-automated.html").replace(/\\/g, "/");

async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

const TABS = (process.env.V6_TABS ?? "practitioners,requests,sessions,gallery,settings").split(",");

test.describe("v6-clone", () => {
  test("live tabs @1440", async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginGlobalAdmin(page);
    for (const tab of TABS) {
      await page.goto(`/globaladmin?tab=${tab}`);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${SHOTS}/live-${tab}-1440.png`, fullPage: true });
    }
  });

  test("live tabs @375", async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 375, height: 800 });
    await loginGlobalAdmin(page);
    for (const tab of TABS) {
      await page.goto(`/globaladmin?tab=${tab}`);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${SHOTS}/live-${tab}-375.png`, fullPage: true });
    }
  });

  test("practitioner expanded @1440", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin?tab=practitioners");
    await page.waitForTimeout(1200);
    // Expand the first practitioner row to reveal the profile card.
    await page.locator("tbody tr").first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/live-practitioner-expanded-1440.png`, fullPage: true });
  });

  test("no body h-scroll @375 across rebuilt tabs + expanded card", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 800 });
    await loginGlobalAdmin(page);
    const results: Record<string, boolean> = {};
    for (const tab of ["practitioners", "gallery", "settings"]) {
      await page.goto(`/globaladmin?tab=${tab}`);
      await page.waitForTimeout(900);
      results[tab] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    }
    // Expanded practitioner card
    await page.goto("/globaladmin?tab=practitioners");
    await page.waitForTimeout(900);
    await page.locator("tbody tr").first().click();
    await page.waitForTimeout(500);
    results["practitioner-expanded"] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.screenshot({ path: `${SHOTS}/live-practitioner-expanded-375.png`, fullPage: true });
    console.log("HSCROLL_375=" + JSON.stringify(results));
  });

  test("request expanded @1440", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin?tab=requests");
    await page.waitForTimeout(1200);
    // Expand a New request (has the Assignment panel). Fall back to first row.
    const newRow = page.locator("tbody tr", { hasText: "Unassigned" }).first();
    if (await newRow.count()) await newRow.click();
    else await page.locator("tbody tr").first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/live-request-expanded-1440.png`, fullPage: true });
  });

  test("assign flow — Confirmed creates a session (no date), then undo", async ({ page }) => {
    test.setTimeout(90000);
    await loginGlobalAdmin(page);
    await page.goto("/globaladmin?tab=requests");
    await page.waitForTimeout(1200);
    const newRow = page.locator("tbody tr", { hasText: "Unassigned" }).first();
    await newRow.click();
    await page.waitForTimeout(500);
    // Pick the practitioner who agreed + gross payout.
    const pracSel = page.locator('select').filter({ hasText: "Not yet assigned" }).first();
    await pracSel.selectOption({ index: 1 });
    await page.locator('input[type=number]').first().fill("8000");
    // Set status → Confirmed (labelled "Matched") → should PATCH /assign and get 200.
    const assignResp = page.waitForResponse((r) => /\/assign$/.test(r.url()) && r.request().method() === "PATCH", { timeout: 20000 });
    const statusSel = page.locator('select').filter({ hasText: "Matched" }).first();
    await statusSel.selectOption("Confirmed");
    const resp = await assignResp;
    const body = await resp.json().catch(() => ({}));
    console.log("ASSIGN_STATUS=" + resp.status() + " REF=" + (body.sessionRef ?? "?"));
    // Undo to clean up the created session.
    await page.getByRole("button", { name: "Undo" }).click().catch(() => {});
    await page.waitForTimeout(1500);
  });

  test("mockup reference @1440", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(MOCKUP);
    await page.waitForTimeout(1000);
    // Mockup uses a left sidebar; capture the whole doc — sections render inline.
    await page.screenshot({ path: `${SHOTS}/mockup-full-1440.png`, fullPage: true });
  });
});
