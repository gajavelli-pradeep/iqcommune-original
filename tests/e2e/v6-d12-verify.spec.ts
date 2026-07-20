import { test, expect, type Page } from "@playwright/test";

// Functional verification of the D11/D12 repairs.
async function login(page: Page, url: string, email: string, password: string) {
  await page.goto(url);
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console|user/, { timeout: 25000 });
}
const asGlobalAdmin = (p: Page) => login(p, "/global-login", "superadmin@iqcommune.in", "Admin@1234");
const asAdmin = (p: Page) => login(p, "/login", "admin@iqcommune.in", "IQCommune@2026");

test("D11 admin sees the team roster but no privileged controls", async ({ page }) => {
  test.setTimeout(90000);
  await asAdmin(page);
  await page.goto("/console?tab=settings");
  await page.waitForTimeout(1800);
  const failed = await page.getByText(/Failed to load team/i).count();
  const rows = await page.locator("tbody tr").count();
  const roleSelects = await page.locator('select[aria-label^="Role for"]').count();
  const actionMenus = await page.locator('button[aria-label^="Actions for"]').count();
  const invite = await page.getByRole("button", { name: "Send invite" }).count();
  const manage = await page.getByRole("button", { name: "Manage team" }).count();
  console.log(`D11 admin failed=${failed} rows=${rows} roleSelects=${roleSelects} actionMenus=${actionMenus} invite=${invite} manage=${manage}`);
  expect(failed, "no 403 banner for a plain admin").toBe(0);
  expect(rows, "roster rows render").toBeGreaterThan(0);
  expect(roleSelects, "no editable role select for a plain admin").toBe(0);
  expect(actionMenus, "no privileged actions menu for a plain admin").toBe(0);
  expect(invite + manage, "no invite/manage controls for a plain admin").toBe(0);
});

test("D11 global admin keeps full team management", async ({ page }) => {
  test.setTimeout(90000);
  await asGlobalAdmin(page);
  await page.goto("/globaladmin?tab=settings");
  await page.waitForTimeout(1800);
  const roleSelects = await page.locator('select[aria-label^="Role for"]').count();
  const actionMenus = await page.locator('button[aria-label^="Actions for"]').count();
  const trash = await page.getByRole("button", { name: /Open trash/i }).count();
  console.log(`D11 GA roleSelects=${roleSelects} actionMenus=${actionMenus} trashButton=${trash}`);
  expect(roleSelects).toBeGreaterThan(0);
  expect(actionMenus).toBeGreaterThan(0);
  expect(trash, "D12: Trash entry point restored").toBe(1);
});

test("D12 Trash modal opens (restore path reachable)", async ({ page }) => {
  test.setTimeout(90000);
  await asGlobalAdmin(page);
  await page.goto("/globaladmin?tab=settings");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Open trash/i }).click();
  await page.waitForTimeout(1200);
  const dialog = await page.getByRole("dialog").count();
  const heading = await page.getByText(/Trash|Deleted|Restore/i).count();
  console.log(`D12 trashDialog=${dialog} trashText=${heading}`);
  expect(dialog + heading).toBeGreaterThan(0);
});

test("D12 session + practitioner edit pencils are reachable for GA", async ({ page }) => {
  test.setTimeout(90000);
  await asGlobalAdmin(page);
  await page.goto("/globaladmin?tab=sessions");
  await page.waitForTimeout(1500);
  const sessionPencils = await page.locator('button[aria-label^="Edit session"]').count();
  await page.goto("/globaladmin?tab=practitioners");
  await page.waitForTimeout(1500);
  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(700);
  const practitionerPencil = await page.locator('button[aria-label^="Edit "]').count();
  console.log(`D12 sessionPencils=${sessionPencils} practitionerPencil=${practitionerPencil}`);
  expect(sessionPencils, "session edit reachable (date/time/venue correctable)").toBeGreaterThan(0);
  expect(practitionerPencil, "practitioner edit reachable").toBeGreaterThan(0);
});

test("D12 consent recovery disclosure present for awaiting rows (GA)", async ({ page }) => {
  test.setTimeout(90000);
  await asGlobalAdmin(page);
  await page.goto("/globaladmin?tab=consent");
  await page.waitForTimeout(1500);
  const awaiting = await page.getByText("Awaiting consent").count();
  const recovery = await page.getByText(/Not received\?/i).count();
  console.log(`D12 awaitingRows=${awaiting} recoveryDisclosures=${recovery}`);
  // Only meaningful when an awaiting row exists.
  if (awaiting > 0) expect(recovery).toBeGreaterThan(0);
});
