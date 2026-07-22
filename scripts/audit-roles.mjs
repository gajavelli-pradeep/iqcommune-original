/**
 * Role audit — signs in as each console role and reports what it can reach.
 *
 * The claim being tested is the one `roles.ts` makes: a capability a role does
 * not hold means the control is NOT RENDERED, not merely hidden. So this counts
 * the controls that actually exist in the DOM per role, and checks the tab list
 * and the landing route.
 *
 * Usage: node scripts/audit-roles.mjs
 * Credentials: QA_PASSWORD, plus the three qa.* accounts.
 */
import { chromium } from "@playwright/test";

const PASSWORD = process.env.QA_PASSWORD;
if (!PASSWORD) throw new Error("set QA_PASSWORD");

const ROLES = [
  { email: "qa.globaladmin@example.com", expect: "global_admin", route: "/globaladmin" },
  { email: "qa.admin@example.com", expect: "admin", route: "/console" },
  { email: "qa.user@example.com", expect: "user", route: "/user" },
];

/** Controls that must never appear for a role lacking the capability. */
const FORBIDDEN = {
  admin: [
    // `override` and `manageTeam` are Global Admin only.
    { label: "field-override pencils", selector: 'button[title="Global Admin override"]' },
    { label: "invite box", selector: "#invite-email" },
    { label: "verbal-rating disclosure", selector: "details" },
  ],
  user: [
    { label: "field-override pencils", selector: 'button[title="Global Admin override"]' },
    { label: "invite box", selector: "#invite-email" },
    { label: "status selects", selector: 'select[id$="-status"]' },
    { label: "invoice fields", selector: 'input[id$="-invoice"]' },
    { label: "gallery dropzone", selector: 'input[type="file"]' },
  ],
};

const browser = await chromium.launch();

for (const role of ROLES) {
  const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(role.email);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

  const landed = new URL(page.url()).pathname;
  const tabs = await page.$$eval("[data-tab]", (nodes) => nodes.map((node) => node.dataset.tab));

  console.log(`\n${role.expect}`);
  console.log(`  route: ${landed} ${landed === role.route ? "✓" : `✗ expected ${role.route}`}`);
  console.log(`  tabs (${tabs.length}): ${tabs.join(", ")}`);

  // Walk every tab and count what exists.
  const found = [];
  for (const tab of tabs) {
    await page.evaluate((id) => {
      const control = document.querySelector(`[data-tab="${id}"]`);
      if (control instanceof HTMLElement) control.click();
    }, tab);
    await page.waitForTimeout(350);

    for (const rule of FORBIDDEN[role.expect] ?? []) {
      const count = await page.locator(`main ${rule.selector}`).count();
      if (count > 0) found.push(`${tab}: ${rule.label} (${count})`);
    }
  }

  console.log(
    found.length ? `  LEAKED CONTROLS:\n    ${found.join("\n    ")}` : "  no forbidden control rendered",
  );

  // A role must not reach another role's route.
  for (const other of ROLES.filter((entry) => entry.route !== role.route)) {
    const response = await page.goto(`http://localhost:3000${other.route}`, { waitUntil: "domcontentloaded" });
    const ended = new URL(page.url()).pathname;
    console.log(
      `  ${other.route} → ${ended} ${ended === role.route ? "✓ redirected home" : `✗ (${response?.status()})`}`,
    );
  }

  console.log(errors.length ? `  console errors:\n    ${errors.join("\n    ")}` : "  console errors: none");
  await context.close();
}

await browser.close();
