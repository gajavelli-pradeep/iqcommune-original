import { test, type Page } from "@playwright/test";

// Full responsive audit across the 6 breakpoint tiers. Measures, per route:
//  - body-level horizontal scroll (P1 if true)
//  - elements whose box extends past the viewport width (named, so fixes are actionable)
//  - at coarse tiers, interactive targets smaller than 44x44
const TIERS = [320, 480, 768, 1024, 1440, 1920];

const PUBLIC_ROUTES = ["/", "/practitioners", "/status", "/login"];
const ADMIN_TABS = [
  "practitioners", "requests", "sessions", "consent",
  "photos", "payouts", "agreements", "gallery", "settings", "activity",
];

async function loginGlobalAdmin(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

async function measure(page: Page, label: string, width: number) {
  await page.waitForTimeout(500);
  const res = await page.evaluate((vw) => {
    const hScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Ignore things inside a deliberately scrollable container.
      let p: HTMLElement | null = el.parentElement;
      let inScroller = false;
      while (p) {
        const ov = getComputedStyle(p).overflowX;
        if ((ov === "auto" || ov === "scroll") && p.scrollWidth > p.clientWidth) { inScroller = true; break; }
        p = p.parentElement;
      }
      if (inScroller) return;
      if (r.right > vw + 1) {
        const id = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").filter(Boolean).slice(0, 2).join(".") : "");
        const txt = (el.textContent ?? "").trim().slice(0, 28);
        offenders.push(`${id}|${Math.round(r.right)}px|${txt}`);
      }
    });
    let smallTargets = 0;
    if (vw <= 480) {
      document.querySelectorAll<HTMLElement>("button, a, input, select, [role=button]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 44 || r.width < 44) smallTargets++;
      });
    }
    return { hScroll, offenders: Array.from(new Set(offenders)).slice(0, 4), smallTargets };
  }, width);
  console.log(`RESP ${label}@${width} hScroll=${res.hScroll} smallTargets=${res.smallTargets} offenders=${JSON.stringify(res.offenders)}`);
}

test("responsive audit — public routes", async ({ page }) => {
  test.setTimeout(300000);
  for (const w of TIERS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const r of PUBLIC_ROUTES) {
      await page.goto(r);
      await measure(page, `pub${r}`, w);
    }
  }
});

test("responsive audit — admin tabs", async ({ page }) => {
  test.setTimeout(600000);
  await loginGlobalAdmin(page);
  for (const w of TIERS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const tab of ADMIN_TABS) {
      await page.goto(`/globaladmin?tab=${tab}`);
      await measure(page, `adm:${tab}`, w);
    }
  }
});
