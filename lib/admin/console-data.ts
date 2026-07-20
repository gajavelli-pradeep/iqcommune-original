import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPaymentFields } from "@/lib/practitioner-payment";
import type { Database } from "@/lib/supabase/database.types";
import type { Agreement } from "@/components/admin/AgreementTable";

// Shared server-side loader for the admin console. All three consoles
// (/console, /globaladmin, /user) render the same AdminConsoleView over the
// same data — this is the single source for that fetch. Reads use the
// service-role client (RLS-bypassing), so console visibility is governed by the
// app's role gating, not by DB policies.

type SubsectionAverages = Database["public"]["Views"]["practitioner_subsection_averages"]["Row"];
export type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"] & {
  subsection_averages: SubsectionAverages | null;
};
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
  // V6 Session Details: the Requestor (SPOC) column + the "Send email" rating
  // request both come from the linked session_request (sessions.request_id).
  requestor?: { name: string; email: string; org: string | null } | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
  photos_submitted?: boolean;
  // V6 §21: Net payout is one number from one source — the Session Consent
  // (confirmation) record. Null until a confirmation exists for the session.
  net_payout?: number | null;
  // Derived: the id of this session's payout (payouts.session_id → sessions.id),
  // if one exists — drives the "View payout" cross-link. Null = no payout yet.
  payout_id?: string | null;
};
export type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
export type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: { name: string; upi_id: string | null; bank_account: string | null; bank_name: string | null } | null;
};
type AgreementFetchRow = Database["public"]["Tables"]["agreements"]["Row"] & {
  practitioner: { name: string; role: string } | null;
};
export type PhotoRow = Database["public"]["Tables"]["photo_submissions"]["Row"] & {
  practitioner_name: string;
  // Whether this submission's photos are currently featured in the public gallery
  // (any gallery_photos row tagged with source_submission_id === this id).
  featured: boolean;
};
export type ConfirmationFetchRow = Database["public"]["Tables"]["confirmations"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};

export interface ConsoleData {
  practitioners: PractitionerRow[];
  sessions: SessionRow[];
  requests: RequestRow[];
  payouts: PayoutRow[];
  agreements: Agreement[];
  photos: PhotoRow[];
  confirmations: ConfirmationFetchRow[];
}

export async function getConsoleData(): Promise<ConsoleData> {
  const db = createAdminClient();
  const [practitioners, sessions, sessionFeedback, requests, payouts, agreementsRes, photosRes, confirmationsRes] = await Promise.all([
    db.from("practitioners").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("sessions").select("*, practitioner:practitioners(name, email)").is("deleted_at", null).order("session_date", { ascending: false }).limit(200),
    db.from("session_feedback").select("id, session_id, overall_rating"),
    db.from("session_requests").select("*, assigned_practitioner:practitioners(name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("payouts").select("*, session:sessions(ref_code, module, session_date), practitioner:practitioners(name, upi_id, bank_account, bank_name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("agreements").select("*, practitioner:practitioners(name, role)").is("deleted_at", null).order("signed_at", { ascending: false }).limit(200),
    db.from("photo_submissions").select("*").order("submitted_at", { ascending: false }).limit(200),
    db.from("confirmations").select("*, practitioner:practitioners(name, email)").is("deleted_at", null).order("issued_on", { ascending: false }).limit(200),
  ]);
  // Surface DB errors so Next.js error.tsx handles them — empty tables on query failure
  // are worse than an error page because they look like "no data" to the admin.
  if (practitioners.error) throw new Error(`Practitioners load failed: ${practitioners.error.message}`);
  if (sessions.error)      throw new Error(`Sessions load failed: ${sessions.error.message}`);
  if (requests.error)      throw new Error(`Session requests load failed: ${requests.error.message}`);
  if (payouts.error)       throw new Error(`Payouts load failed: ${payouts.error.message}`);
  if (agreementsRes.error) throw new Error(`Agreements load failed: ${agreementsRes.error.message}`);

  // Join session_feedback in JS — avoids FK-based PostgREST join that fails on stale schema cache
  const feedbackBySession = Object.fromEntries(
    (sessionFeedback.data ?? []).map((f) => [f.session_id, { id: f.id, overall_rating: f.overall_rating }])
  );
  // photo_submissions.session_ref === sessions.ref_code — flag sessions that have photos.
  const refsWithPhotos = new Set((photosRes.data ?? []).map((p) => p.session_ref));
  // session_id → payout id, from the already-fetched payouts (no extra query) —
  // lets each session row deep-link to its payout via the "View payout" action.
  const payoutIdBySession: Record<string, string> = {};
  for (const p of (payouts.data ?? []) as Array<{ id: string; session_id: string | null }>) {
    if (p.session_id) payoutIdBySession[p.session_id] = p.id;
  }
  // Net payout per session from its confirmation (single source, V6 §21).
  // confirmations are ordered issued_on desc, so the first seen is the latest.
  const netBySession: Record<string, number> = {};
  for (const c of (confirmationsRes.data ?? []) as Array<{ session_id: string | null; net_amount: number }>) {
    if (c.session_id && !(c.session_id in netBySession)) netBySession[c.session_id] = c.net_amount;
  }
  // Requestor (SPOC) per session — joined in JS from the already-fetched requests
  // (no FK relation exists between sessions.request_id and session_requests, so a
  // PostgREST embed fails; this mirrors the session_feedback JS-join above).
  const requestorById: Record<string, { name: string; email: string; org: string | null }> = {};
  for (const r of (requests.data ?? []) as Array<{ id: string; name: string; email: string; org: string | null }>) {
    requestorById[r.id] = { name: r.name, email: r.email, org: r.org };
  }
  const sessionsWithFeedback: SessionRow[] = (sessions.data ?? []).map((s) => ({
    ...s,
    session_feedback: feedbackBySession[s.id] ? [feedbackBySession[s.id]] : [],
    photos_submitted: s.ref_code ? refsWithPhotos.has(s.ref_code) : false,
    net_payout: netBySession[s.id] ?? null,
    requestor: s.request_id ? requestorById[s.request_id] ?? null : null,
    payout_id: payoutIdBySession[s.id] ?? null,
  })) as SessionRow[];

  // Build ref→name map from already-fetched practitioners — zero extra queries
  const nameByRef: Record<string, string> = {};
  for (const p of practitioners.data ?? []) {
    if (p.ref_code) nameByRef[p.ref_code] = p.name;
  }
  // Which submissions are featured in the public gallery. Non-fatal — the
  // source_submission_id column only exists after migration 0031, so an error
  // (pre-migration) simply means "nothing featured yet".
  const featuredIds = new Set<string>();
  const galleryFeatured = await db.from("gallery_photos").select("source_submission_id");
  if (!galleryFeatured.error) {
    for (const g of galleryFeatured.data ?? []) {
      const sid = (g as { source_submission_id?: string | null }).source_submission_id;
      if (sid) featuredIds.add(sid);
    }
  }

  // Photos query failure is non-fatal — show empty state rather than crashing the admin
  const photos: PhotoRow[] = (photosRes.data ?? []).map((p) => ({
    ...p,
    practitioner_name: nameByRef[p.practitioner_ref] ?? p.practitioner_ref,
    featured: featuredIds.has(p.id),
  }));

  const agreements: Agreement[] = ((agreementsRes.data ?? []) as AgreementFetchRow[]).map((a) => ({
    ...a,
    practitioner_name: a.practitioner?.name ?? "—",
    practitioner_role: a.practitioner?.role ?? "—",
  }));

  // Per-practitioner subsection averages (view). Non-fatal — absent view/data
  // just means no breakdown is shown.
  const subsectionAvg = await db.from("practitioner_subsection_averages").select("*");
  const avgByPractitioner = Object.fromEntries(
    (subsectionAvg.data ?? []).map((r) => [r.practitioner_id, r])
  );
  const practitionersWithAverages: PractitionerRow[] = (practitioners.data ?? []).map((p) => ({
    ...decryptPaymentFields(p),
    subsection_averages: avgByPractitioner[p.id] ?? null,
  }));

  // Payout rows join the practitioner's (encrypted) payment fields — decrypt those too.
  const payoutsDecrypted = ((payouts.data ?? []) as PayoutRow[]).map((p) => ({
    ...p,
    practitioner: p.practitioner ? decryptPaymentFields(p.practitioner) : null,
  }));

  return {
    practitioners: practitionersWithAverages,
    sessions: sessionsWithFeedback,
    requests: (requests.data ?? []) as RequestRow[],
    payouts: payoutsDecrypted,
    agreements,
    photos,
    confirmations: (confirmationsRes.data ?? []) as ConfirmationFetchRow[],
  };
}
