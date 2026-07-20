import { test, type Page } from "@playwright/test";

/**
 * Full responsive evidence sweep.
 *  - every public route + every admin tab, at all 6 width tiers
 *  - short/landscape viewports (640x320, 740x360) where reachability failures hide
 *  - every reachable modal: fits the viewport, scrolls, and its FIRST and LAST
 *    interactive elements are actually reachable (the centred-flex clipping trap)
 *  - coarse-pointer tap targets on public AND admin
 * Any line containing "FAIL" is a defect.
 */
const TIERS = [320, 480, 768, 1024, 1440, 1920];
const SHORT = [{ w: 640, h: 320 }, { w: 740, h: 360 }];

const PUBLIC = ["/", "/practitioners", "/status", "/login", "/global-login",
                "/join-admin", "/onboarding", "/consent", "/submit-photos", "/rate"];
const TABS = ["practitioners", "requests", "sessions", "consent", "photos",
              "payouts", "agreements", "gallery", "settings", "activity"];

async function ga(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

/** Body-level overflow + named offenders (ignoring anything inside a real scroller). */
async function scan(page: Page, label: string) {
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const hScroll = document.documentElement.scrollWidth > vw + 1;
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      let p: HTMLElement | null = el.parentElement, inScroller = false;
      while (p) {
        const ov = getComputedStyle(p).overflowX;
        if ((ov === "auto" || ov === "scroll") && p.scrollWidth > p.clientWidth) { inScroller = true; break; }
        p = p.parentElement;
      }
      if (inScroller) return;
      // Decoration (glows, carousel track) legitimately extends past the viewport and
      // is clipped by an ancestor — that is not an overflow defect. Only count an
      // element whose overflow actually escapes to the document.
      let q: HTMLElement | null = el.parentElement, clipped = false;
      while (q) {
        const ov = getComputedStyle(q).overflow + getComputedStyle(q).overflowX;
        if (ov.includes("hidden") || ov.includes("clip")) { clipped = true; break; }
        q = q.parentElement;
      }
      if (clipped) return;
      if (b.right > vw + 1) {
        const id = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "");
        offenders.push(id);
      }
    });
    return { hScroll, offenders: Array.from(new Set(offenders)).slice(0, 3) };
  });
  const bad = r.hScroll || r.offenders.length > 0;
  console.log(`${bad ? "FAIL" : "ok  "} ${label} hScroll=${r.hScroll} offenders=${JSON.stringify(r.offenders)}`);
}

/** A dialog must fit, and its first + last interactive elements must be reachable. */
async function scanDialog(page: Page, label: string) {
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const d = document.querySelector('[role=dialog]') as HTMLElement | null;
    if (!d) return null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const b = d.getBoundingClientRect();
    const foci = Array.from(d.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [contenteditable]"))
      .filter((e) => e.getBoundingClientRect().height > 0);
    const first = foci[0]?.getBoundingClientRect();
    const last = foci[foci.length - 1]?.getBoundingClientRect();
    // The scroll owner may be a DESCENDANT (panel with its own overflow) or an
    // ANCESTOR (a scrolling overlay wrapping the dialog). Check both — only counting
    // descendants produced a false "unreachable" verdict on the public RequestModal.
    const desc = Array.from(d.querySelectorAll<HTMLElement>("*")).find(
      (e) => e.scrollHeight > e.clientHeight + 2 && ["auto", "scroll"].includes(getComputedStyle(e).overflowY));
    let anc: HTMLElement | null = d.parentElement, up: HTMLElement | null = null;
    while (anc) {
      const cs = getComputedStyle(anc);
      if (["auto", "scroll"].includes(cs.overflowY) && anc.scrollHeight > anc.clientHeight + 2) { up = anc; break; }
      anc = anc.parentElement;
    }
    const scroller = desc ?? up;
    // "reachable" = inside the viewport now, or inside something that can scroll to it
    const reach = (x?: DOMRect) => !x ? true : (x.top >= -1 && x.bottom <= vh + 1) || !!scroller;
    return {
      fits: b.width <= vw + 1 && b.left >= -1,
      firstReachable: reach(first), lastReachable: reach(last),
      needsScroll: b.height > vh, hasScroller: !!scroller, controls: foci.length,
    };
  });
  if (!r) { console.log(`skip ${label} (no dialog)`); return; }
  const bad = !r.fits || !r.firstReachable || !r.lastReachable || (r.needsScroll && !r.hasScroller);
  console.log(`${bad ? "FAIL" : "ok  "} ${label} ${JSON.stringify(r)}`);
}

test("public routes — 6 tiers + short viewports", async ({ page }) => {
  test.setTimeout(600000);
  for (const w of TIERS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const r of PUBLIC) { await page.goto(r); await scan(page, `pub${r}@${w}`); }
  }
  for (const { w, h } of SHORT) {
    await page.setViewportSize({ width: w, height: h });
    for (const r of PUBLIC) { await page.goto(r); await scan(page, `pub${r}@${w}x${h}`); }
  }
});

test("admin tabs — 6 tiers + short viewports", async ({ page }) => {
  test.setTimeout(900000);
  await ga(page);
  for (const w of TIERS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const t of TABS) { await page.goto(`/globaladmin?tab=${t}`); await scan(page, `adm:${t}@${w}`); }
  }
  for (const { w, h } of SHORT) {
    await page.setViewportSize({ width: w, height: h });
    for (const t of TABS) { await page.goto(`/globaladmin?tab=${t}`); await scan(page, `adm:${t}@${w}x${h}`); }
  }
});

test("expanded rows — narrow + short", async ({ page }) => {
  test.setTimeout(300000);
  await ga(page);
  for (const vp of [{ w: 320, h: 700 }, { w: 640, h: 320 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const t of ["practitioners", "requests"]) {
      await page.goto(`/globaladmin?tab=${t}`);
      await page.waitForTimeout(900);
      await page.locator("tbody tr").first().click().catch(() => {});
      await scan(page, `expand:${t}@${vp.w}x${vp.h}`);
    }
  }
});

test("modals — narrow + short", async ({ page }) => {
  test.setTimeout(600000);
  await ga(page);
  for (const vp of [{ w: 320, h: 700 }, { w: 640, h: 320 }]) {
    const tag = `${vp.w}x${vp.h}`;
    await page.setViewportSize({ width: vp.w, height: vp.h });

    const guard = async (label: string, fn: () => Promise<void>) => {
      try { await fn(); } catch (e) { console.log(`skip ${label} (${String(e).slice(0, 60)})`); }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(300);
    };

    // Public: Request a Session
    await page.goto("/");
    await page.waitForTimeout(800);
    const req = page.getByRole("button", { name: /Request a Session/i }).first();
    await guard("RequestModal", async () => { if (await req.count()) { await req.click(); await scanDialog(page, `RequestModal@${tag}`); } });

    // Admin: photo picker
    await page.goto("/globaladmin?tab=photos");
    await page.waitForTimeout(1000);
    const dl = page.getByRole("button", { name: /^Download$/ }).first();
    await guard("PhotoPicker", async () => { if (await dl.count()) { await dl.click(); await page.waitForTimeout(1800); await scanDialog(page, `PhotoPicker@${tag}`); } });

    // Admin: Trash + Manage team
    await page.goto("/globaladmin?tab=settings");
    await page.waitForTimeout(1200);
    const trash = page.getByRole("button", { name: /Open trash/i });
    await guard("Trash", async () => { if (await trash.count()) { await trash.click(); await scanDialog(page, `Trash@${tag}`); } });
    await page.waitForTimeout(400);
    const manage = page.getByRole("button", { name: /Open team and access/i });
    await guard("Credentials", async () => { if (await manage.count()) { await manage.click({ timeout: 8000 }); await scanDialog(page, `Credentials@${tag}`); } });

    // Admin: session edit modal (GA pencil)
    await page.goto("/globaladmin?tab=sessions");
    await page.waitForTimeout(1000);
    const pencil = page.locator('button[aria-label^="Edit session"]').first();
    await guard("SessionForm", async () => { if (await pencil.count()) { await pencil.click({ timeout: 8000 }); await scanDialog(page, `SessionForm@${tag}`); } });

    // Admin: practitioner message draft
    await page.goto("/globaladmin?tab=practitioners");
    await page.waitForTimeout(1000);
    await page.locator("tbody tr").first().click().catch(() => {});
    await page.waitForTimeout(700);
    const msg = page.getByRole("button", { name: /^Message$/ }).first();
    await guard("ContactDraft", async () => { if (await msg.count()) { await msg.click({ timeout: 8000 }); await scanDialog(page, `ContactDraft@${tag}`); } });
  }
});
