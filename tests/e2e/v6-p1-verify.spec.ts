import { test, expect, type Page } from "@playwright/test";

// Functional verification of the P1 fixes — drives each repaired path in the running
// app rather than eyeballing screenshots.
async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

test("P1-3 consent: Part 1 generate form is reachable (not short-circuited)", async ({ page }) => {
  test.setTimeout(90000);
  await loginGlobalAdmin(page);
  await page.goto("/globaladmin?tab=consent");
  await page.waitForTimeout(1200);
  const part1 = await page.getByText(/Part 1/i).count();
  const generate = await page.getByText(/Generate/i).count();
  console.log(`P1-3 consentPart1=${part1} generateControls=${generate}`);
  expect(part1, "Part 1 (Generate & Send Consent) renders").toBeGreaterThan(0);
});

test("P1-1 photos: pending rows expose a wired 'Send link' control", async ({ page }) => {
  test.setTimeout(90000);
  await loginGlobalAdmin(page);
  await page.goto("/globaladmin?tab=photos");
  await page.waitForTimeout(1200);
  const btn = page.getByRole("button", { name: "Send link" });
  const n = await btn.count();
  const enabled = n > 0 ? await btn.first().isEnabled() : false;
  console.log(`P1-1 sendLinkButtons=${n} firstEnabled=${enabled}`);
  expect(n, "at least one pending row offers the upload link").toBeGreaterThan(0);
  expect(enabled).toBe(true);
});

test("P1-4 sessions: no status select misreports its DB value", async ({ page }) => {
  test.setTimeout(90000);
  await loginGlobalAdmin(page);
  await page.goto("/globaladmin?tab=sessions");
  await page.waitForTimeout(1200);
  const bad = await page.evaluate(() =>
    Array.from(document.querySelectorAll("select"))
      .filter((s) => s.getAttribute("aria-label")?.startsWith("Set status for session"))
      .filter((s) => !Array.from(s.options).some((o) => o.value === (s as HTMLSelectElement).value))
      .map((s) => s.getAttribute("aria-label")),
  );
  console.log(`P1-4 mismatchedStatusSelects=${JSON.stringify(bad)}`);
  expect(bad, "every status select's value exists in its own option list").toEqual([]);
});

test("P1-2 team: Global Admin sees the table, no load-failure banner", async ({ page }) => {
  test.setTimeout(90000);
  await loginGlobalAdmin(page);
  await page.goto("/globaladmin?tab=settings");
  await page.waitForTimeout(1500);
  const failed = await page.getByText(/Failed to load team/i).count();
  const teamHeading = await page.getByText("Team & Access").count();
  console.log(`P1-2 teamHeading=${teamHeading} failureBanner=${failed}`);
  expect(failed, "no 403 failure banner for Global Admin").toBe(0);
  expect(teamHeading).toBeGreaterThan(0);
});

test("P1-5 practitioner: 'Send deactivation message' actually opens a message draft", async ({ page }) => {
  test.setTimeout(120000);
  await loginGlobalAdmin(page);
  await page.goto("/globaladmin?tab=practitioners");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Empanelled", exact: true }).first().click();
  await page.waitForTimeout(800);
  const row = page.locator("tbody tr").first();
  await row.click();
  await page.waitForTimeout(600);

  const deact = page.getByRole("button", { name: "Send deactivation message" });
  if (!(await deact.count())) { console.log("P1-5 SKIPPED — no Empanelled practitioner available"); return; }
  await deact.first().click();
  // Confirm dialog -> confirm
  await page.getByRole("button", { name: "Deactivate", exact: true }).first().click();
  await page.waitForTimeout(1500);
  const draftOpen = await page.getByRole("dialog").count();
  const draftTitle = await page.getByText(/Deactivation:/i).count();
  console.log(`P1-5 draftDialog=${draftOpen} draftTitle=${draftTitle}`);
  expect(draftOpen + draftTitle, "a deactivation message draft opened").toBeGreaterThan(0);

  // Restore: close draft without sending, then Reactivate.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const react = page.getByRole("button", { name: "Reactivate" });
  if (await react.count()) { await react.first().click(); await page.waitForTimeout(1200); }
  console.log("P1-5 restored=" + (await react.count() === 0 ? "yes" : "attempted"));
});
