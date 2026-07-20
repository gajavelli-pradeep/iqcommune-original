import { test, type Page } from "@playwright/test";

// Captures live-vs-mockup screenshot pairs for the V6 visual-diff pass. Not an
// assertion suite — it produces PNGs into v6-diff/ for side-by-side review.
// Run: npx playwright test v6-pixel-diff --workers=1

const DIR = "v6-diff";
const MOCK =
  "file:///D:/Desktop/Ultra_core/iqcommune_project/client_requirements/completelyautomatedsetup%20(V6)/iqcommune-admin-console-automated.html";
const FILES = "file:///D:/Desktop/Ultra_core/iqcommune_project/client_requirements/completelyautomatedsetup%20(V6)/files";

// tab label → [mockup switchTab key, live ?tab= key]
const TABS: [string, string, string][] = [
  ["practitioners", "practitioners", "practitioners"],
  ["agreements", "agreements", "agreements"],
  ["requests", "requests", "requests"],
  ["consent", "confirmations", "consent"],
  ["sessions", "sessions", "sessions"],
  ["photos", "photos", "photos"],
  ["payouts", "payouts", "payouts"],
  ["activity", "activity", "activity"],
  ["settings", "settings", "settings"],
];

async function login(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 20000 });
}

test("capture admin console pairs @1440", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Live
  await login(page);
  for (const [name, , liveKey] of TABS) {
    await page.goto(`/globaladmin?tab=${liveKey}`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/live-${name}.png`, fullPage: true });
  }

  // Mockup
  await page.goto(MOCK);
  await page.waitForTimeout(800);
  for (const [name, mockKey] of TABS) {
    await page.click(`[onclick*="switchTab('${mockKey}'"]`).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/mock-${name}.png`, fullPage: true });
  }
});

test("capture rating page pair @390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const token = "5fc2a83338368420005fb49852a884a1d3dd693818c6d56fc6c9761120ecdde2";
  await page.goto(`/rate?ref=IQC-SES-0008&token=${token}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/live-rating.png`, fullPage: true });
  await page.goto(`${FILES}/iqcommune-practitioner-rating.html`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/mock-rating.png`, fullPage: true });
});
