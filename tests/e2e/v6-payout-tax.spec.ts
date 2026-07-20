import { test, expect, type Page } from "@playwright/test";

/**
 * P1: the payout must equal the SIGNED confirmation, not the session's own figures.
 *
 * With gross 10,000 / TDS 10% / GST 18% the three possible answers are distinguishable:
 *   10,800 = gross x (1 - 0.10 + 0.18)  <- correct, matches the signed consent
 *    9,000 = gross - TDS only            <- old bug, GST ignored
 *   10,000 = gross untouched             <- old bug when tds_applicable was off
 *
 * Builds its own state via the app's APIs and removes it in `finally`.
 */
async function ga(page: Page) {
  await page.goto("/global-login");
  await page.fill("input[type=email]", "superadmin@iqcommune.in");
  await page.fill("input[type=password]", "Admin@1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/globaladmin|console/, { timeout: 25000 });
}

test("payout net comes from the signed confirmation (GST included)", async ({ page }) => {
  test.setTimeout(240000);
  await ga(page);

  let practitionerId = "", originalStatus = "", requestId = "", sessionId = "", confirmationId = "";

  try {
    const setup = await page.evaluate(async () => {
      const arr = (v: unknown) => (Array.isArray(v) ? v : ((v as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
      const prs = arr(await fetch("/api/admin/practitioners").then((r) => r.json()));
      const reqs = arr(await fetch("/api/admin/session-requests").then((r) => r.json()));
      const p = prs.find((x) => x.status !== "Rejected" && x.status !== "Deactivated");
      const rq = reqs.find((x) => x.status === "New");
      if (!p || !rq) return { error: `practitioner=${!!p} request=${!!rq}` };
      await fetch(`/api/admin/practitioners/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Empanelled" }),
      });
      const assign = await fetch(`/api/admin/session-requests/${rq.id}/assign`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: p.id, payoutAmount: 10000 }),
      });
      const body = await assign.json().catch(() => ({}));
      return { practitionerId: p.id, originalStatus: p.status, requestId: rq.id, sessionId: body.sessionId, sessionRef: body.sessionRef };
    });
    console.log("SETUP " + JSON.stringify(setup));
    expect(setup.error).toBeUndefined();
    ({ practitionerId, originalStatus, requestId } = setup as Record<string, string>);
    sessionId = setup.sessionId!;

    // Signed consent: gross 10,000, TDS 10%, GST 18% -> net 10,800
    const gen = await page.evaluate(async (sid) => {
      const res = await fetch("/api/admin/consent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, gross: 10000, tdsRate: 10, gstRate: 18, startTime: "10:00", duration: "3 hours", sendEmail: false }),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    }, sessionId);
    console.log(`CONSENT status=${gen.status} ref=${gen.body?.data?.ref_code} net=${gen.body?.data?.net}`);
    expect(gen.status).toBe(201);
    confirmationId = gen.body?.data?.id ?? "";
    expect(gen.body?.data?.net, "consent net includes GST").toBe(10800);

    // Completing the session auto-creates the payout.
    const done = await page.evaluate(async (sid) => {
      const res = await fetch(`/api/admin/sessions/${sid}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    }, sessionId);
    console.log(`COMPLETE status=${done.status}`);

    const payout = await page.evaluate(async (sid) => {
      const arr = (v: unknown) => (Array.isArray(v) ? v : ((v as { data?: unknown[] })?.data ?? [])) as Record<string, unknown>[];
      const rows = arr(await fetch("/api/admin/payouts").then((r) => r.json()));
      const hit = rows.find((p) => p.session_id === sid);
      return hit ? { id: hit.id, gross: hit.gross_amount, net: hit.net_amount } : null;
    }, sessionId);
    console.log("PAYOUT " + JSON.stringify(payout));

    expect(payout, "a payout was created").not.toBeNull();
    expect(payout!.gross, "gross matches the signed consent").toBe(10000);
    expect(payout!.net, "net matches the signed consent (GST included), not gross-TDS").toBe(10800);
  } finally {
    const cleanup = await page.evaluate(async ({ cid, rid, pid, st, sid }) => {
      const call = async (u: string, m: string, b?: unknown) => {
        try { const r = await fetch(u, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return r.status; } catch { return "err"; }
      };
      const out: Record<string, unknown> = {};
      const arr = (v: unknown) => (Array.isArray(v) ? v : ((v as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
      const rows = arr(await fetch("/api/admin/payouts").then((r) => r.json()));
      const mine = rows.find((p) => p.session_id === sid);
      if (mine) out.payout = await call(`/api/admin/global/payouts/${mine.id}`, "DELETE");
      if (cid) out.supersede = await call(`/api/admin/global/consent/${cid}`, "PATCH", { status: "Superseded" });
      if (sid) out.session = await call(`/api/admin/global/sessions/${sid}`, "DELETE");
      if (rid) out.request = await call(`/api/admin/session-requests?id=${rid}`, "PATCH", { status: "New" });
      if (pid && st) out.practitioner = await call(`/api/admin/practitioners/${pid}`, "PATCH", { status: st });
      return out;
    }, { cid: confirmationId, rid: requestId, pid: practitionerId, st: originalStatus, sid: sessionId });
    console.log("CLEANUP " + JSON.stringify(cleanup));
  }
});
