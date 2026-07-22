/**
 * Drives the console's global search the way an operator does: type, look at
 * the list, pick a result, and confirm the record is actually on screen.
 * Mouse first, then the same journey on the keyboard alone.
 */
import { chromium } from "@playwright/test";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));

await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.getByLabel(/email/i).fill("qa.globaladmin@example.com");
await p.getByLabel(/password/i).first().fill(process.env.QA_PASSWORD);
await p.getByRole("button", { name: /sign in|log in/i }).click();
await p.waitForURL(/globaladmin/, { timeout: 30000 });

const box = p.locator("#console-search");

// A name we know is in the pipeline, taken from the rendered table itself.
// The first cell leads with the expander's screen-reader label, so strip it.
const firstName = (await p.locator("tbody tr td").first().innerText())
  .replace(/^(Show|Hide) details for /, "")
  .trim()
  .split("\n")[0];
console.log("searching for:", JSON.stringify(firstName));

await box.click();
await box.fill(firstName.slice(0, 6));
await p.waitForTimeout(400);

const options = p.locator('[role="option"]');
console.log("results        :", await options.count());
if (await options.count()) console.log("first result   :", (await options.first().innerText()).replace(/\n/g, " · "));

// Go somewhere else first, so the jump has to do real work.
await p.locator('[data-tab="payouts"]').click();
await p.waitForTimeout(300);
await box.click();
await box.fill(firstName.slice(0, 6));
await p.waitForTimeout(400);
await options.first().click();
await p.waitForTimeout(900);

console.log("tab after pick :", (await p.locator("h1").innerText()).trim());
const expanded = await p.locator('[aria-expanded="true"]').count();
console.log("expanded rows  :", expanded);
const inView = await p.evaluate(() => {
  const el = document.querySelector('[aria-expanded="true"]');
  if (!el) return "none";
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= innerHeight ? "in view" : `off screen (top ${Math.round(r.top)})`;
});
console.log("focused row    :", inView);
console.log("query cleared  :", JSON.stringify(await box.inputValue()));

// Keyboard only.
await box.click();
await p.keyboard.type(firstName.slice(0, 6));
await p.waitForTimeout(400);
await p.keyboard.press("ArrowDown");
const activeId = await box.getAttribute("aria-activedescendant");
console.log("activedescend. :", activeId ? "set" : "MISSING");
await p.keyboard.press("Enter");
await p.waitForTimeout(800);
console.log("kbd tab        :", (await p.locator("h1").innerText()).trim());
console.log("kbd expanded   :", await p.locator('[aria-expanded="true"]').count());

// Escape closes the list without wiping a long query.
await box.click();
await p.keyboard.type("zzz-no-match");
await p.waitForTimeout(300);
console.log("no-match shown :", (await p.locator('[role="listbox"]').innerText()).trim().slice(0, 40));
await p.keyboard.press("Escape");
await p.waitForTimeout(200);
console.log("after Escape   : list=", await p.locator('[role="listbox"]').count(), "query=", JSON.stringify(await box.inputValue()));

console.log(errs.length ? "ERRORS: " + errs.join(" | ") : "page errors: none");
await b.close();
