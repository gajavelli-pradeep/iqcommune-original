import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies the two surfaces that needed DB state the console did not have:
 *   1. the photo-guide preview modal   (needs a session with status "Upcoming")
 *   2. the consent recovery disclosure (needs an "Awaiting consent" confirmation)
 *
 * Setup runs through the app's own admin APIs, then the UI is driven for real, then
 * `finally` removes every dummy record and restores the practitioner's status.
 * No email is ever sent: the confirmation is generated with sendEmail:false and this
 * environment has no BREVO_API_KEY configured.
 */
async function ga(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

test("photo-guide modal + consent recovery, on real dummy state", async ({ page }) => {
  test.setTimeout(240000);
  await ga(page);

  let practitionerId = "", originalStatus = "", requestId = "", confirmationId = "", createdSessionId = "";

  try {
    // ── Setup ─────────────────────────────────────────────────────────────────────
    const setup = await page.evaluate(async () => {
      const arr = (v: unknown) => (Array.isArray(v) ? v : ((v as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
      const prs = arr(await fetch("/api/admin/practitioners").then((r) => r.json()));
      const reqs = arr(await fetch("/api/admin/session-requests").then((r) => r.json()));
      const p = prs.find((x) => x.status !== "Rejected" && x.status !== "Deactivated");
      const rq = reqs.find((x) => x.status === "New");
      if (!p || !rq) return { error: `practitioner=${!!p} request=${!!rq}` };
      // Manual-empanel path (the same route the console's "Mark Empanelled manually" uses).
      const emp = await fetch(`/api/admin/practitioners/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Empanelled" }),
      });
      return { practitionerId: p.id, originalStatus: p.status, requestId: rq.id, empStatus: emp.status };
    });
    console.log("SETUP " + JSON.stringify(setup));
    expect(setup.error, "found a practitioner + a New request").toBeUndefined();
    practitionerId = setup.practitionerId!; originalStatus = setup.originalStatus!; requestId = setup.requestId!;
    expect(setup.empStatus, "practitioner empanelled").toBeLessThan(400);

    const assigned = await page.evaluate(async ({ rid, pid }) => {
      const res = await fetch(`/api/admin/session-requests/${rid}/assign`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: pid, payoutAmount: 7500 }),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    }, { rid: requestId, pid: practitionerId });
    console.log(`SETUP session=${assigned.body?.sessionRef} status=${assigned.status}`);
    expect(assigned.status, "session created").toBe(200);
    const sessionId: string = assigned.body.sessionId;
    createdSessionId = sessionId;

    // ── 1. Photo-guide preview modal ─────────────────────────────────────────────
    await page.goto("/globaladmin?tab=consent");
    await page.waitForTimeout(2000);
    // Scope to PhotoGuideSection's own picker — ConsentFormModal's Part 1 has a
    // session picker too, and grabbing the first IQC-SES select hit the wrong one.
    // Two pickers carry that label — ConsentFormModal's Part 1 (option shows the
    // session date) and PhotoGuideSection's (option shows the practitioner). The
    // latter renders last in the tab.
    const guidePicker = page.locator("label").filter({ hasText: "Select Confirmed session" }).locator("select").last();
    const opts = await guidePicker.locator("option").allInnerTexts();
    console.log(`GUIDE pickerOptions=${JSON.stringify(opts)}`);
    await guidePicker.selectOption({ index: 1 });
    await page.waitForTimeout(800);
    const preview = page.getByRole("button", { name: /Preview photo request guide/i });
    const enabled = await preview.first().isEnabled();
    console.log(`GUIDE enabled=${enabled}`);
    expect(enabled, "preview enabled once a session is picked").toBe(true);
    await preview.first().click({ timeout: 10000 });
    await page.waitForTimeout(900);
    const guide = await page.evaluate(() => {
      const d = document.querySelector('[role=dialog]') as HTMLElement | null;
      if (!d) return null;
      const t = d.textContent ?? "";
      return {
        title: /Photo request guide/.test(t),
        subtitle: /Session details \+ a shot guide/.test(t),
        refLine: /Session details . for reference/.test(t),
        shotGuide: /Shot guide . what to ask/.test(t),
        shotItems: d.querySelectorAll("li").length,
        draftBtn: /Draft email with guide/.test(t),
        downloadBtn: /Download guide \(PDF\)/.test(t),
      };
    });
    console.log("GUIDE modal=" + JSON.stringify(guide));
    expect(guide).not.toBeNull();
    expect(guide!.title && guide!.subtitle && guide!.refLine && guide!.shotGuide && guide!.draftBtn && guide!.downloadBtn).toBe(true);
    expect(guide!.shotItems).toBeGreaterThan(0);

    await page.setViewportSize({ width: 640, height: 320 });
    await page.waitForTimeout(500);
    const fit = await page.evaluate(() => {
      const d = document.querySelector('[role=dialog]') as HTMLElement;
      const b = d.getBoundingClientRect();
      const sc = Array.from(d.querySelectorAll<HTMLElement>("*")).find((e) => e.scrollHeight > e.clientHeight + 2 && ["auto", "scroll"].includes(getComputedStyle(e).overflowY));
      return { fits: b.width <= window.innerWidth + 1, hasScroller: !!sc, bodyScroll: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    console.log("GUIDE @640x320=" + JSON.stringify(fit));
    expect(fit.fits && !fit.bodyScroll && fit.hasScroller).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.keyboard.press("Escape");

    // ── 2. Consent recovery disclosure ───────────────────────────────────────────
    const gen = await page.evaluate(async (sid) => {
      const res = await fetch("/api/admin/consent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, gross: 7500, tdsRate: 10, gstRate: 18, startTime: "10:00", duration: "3 hours", sendEmail: false }),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    }, sessionId);
    console.log(`SETUP confirmation=${gen.body?.data?.ref_code} status=${gen.status}`);
    expect(gen.status).toBe(201);
    confirmationId = gen.body?.data?.id ?? "";

    await page.goto("/globaladmin?tab=consent");
    await page.waitForTimeout(2200);
    // The status pill relabels "Awaiting consent", so counting that literal text is
    // unreliable — the disclosure only renders for row.status === "Awaiting consent",
    // which makes its presence the trustworthy signal.
    const disclosure = page.getByText(/Not received\?/i);
    console.log(`RECOVERY disclosures=${await disclosure.count()}`);
    expect(await disclosure.count(), "recovery disclosure rendered on the awaiting row").toBeGreaterThan(0);

    await disclosure.first().click();
    await page.waitForTimeout(400);
    const resend = page.getByRole("button", { name: /Resend consent email/i });
    const mark = page.getByRole("button", { name: /Mark received/i });
    console.log(`RECOVERY resendBtn=${await resend.count()} markBtn=${await mark.count()}`);
    expect(await resend.count()).toBeGreaterThan(0);
    expect(await mark.count()).toBeGreaterThan(0);

    // Drive the non-emailing branch and prove it persists.
    const markResp = page.waitForResponse((r) => /mark-received/.test(r.url()), { timeout: 25000 });
    await mark.first().click();
    const mr = await markResp;
    console.log(`RECOVERY markReceived=${mr.status()}`);
    expect(mr.status()).toBeLessThan(400);
  } finally {
    // ── Cleanup: remove dummy records, restore the practitioner ──────────────────
    try {
      const cleanup = await page.evaluate(async ({ cid, rid, pid, st, sid }) => {
        const out: Record<string, unknown> = {};
        const call = async (u: string, m: string, b?: unknown) => {
          try { const r = await fetch(u, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return r.status; }
          catch { return "err"; }
        };
        // Confirmations cannot be deleted by design (status-override only), and a
        // confirmation blocks unassign — so supersede it, soft-delete the session, and
        // put the request + practitioner back where they were.
        const arr = (v: unknown) => (Array.isArray(v) ? v : ((v as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
        if (cid) out.supersede = await call(`/api/admin/global/consent/${cid}`, "PATCH", { status: "Superseded" });
        if (sid) out.sessionDeleted = await call(`/api/admin/global/sessions/${sid}`, "DELETE");
        if (rid) out.request = await call(`/api/admin/session-requests?id=${rid}`, "PATCH", { status: "New" });
        if (pid && st) out.practitioner = await call(`/api/admin/practitioners/${pid}`, "PATCH", { status: st });
        const s2 = arr(await fetch("/api/admin/sessions").then((r) => r.json()));
        out.AFTER_upcoming = s2.filter((x) => x.status === "Upcoming").map((x) => x.ref_code);
        out.AFTER_sessions = s2.length;
        return out;
      }, { cid: confirmationId, rid: requestId, pid: practitionerId, st: originalStatus, sid: createdSessionId });
      console.log("CLEANUP " + JSON.stringify(cleanup));
    } catch (e) { console.log("CLEANUP FAILED " + String(e).slice(0, 120)); }
  }
});
