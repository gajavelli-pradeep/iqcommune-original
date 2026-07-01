import { createAdminClient } from "@/lib/supabase/admin";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import type { Database } from "@/lib/supabase/database.types";
import type { Agreement } from "@/components/admin/AgreementTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Console" };
export const dynamic = "force-dynamic";

type SubsectionAverages = Database["public"]["Views"]["practitioner_subsection_averages"]["Row"];
type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"] & {
  subsection_averages: SubsectionAverages | null;
};
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
  photos_submitted?: boolean;
};
type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: { name: string; upi_id: string | null; bank_account: string | null; bank_name: string | null } | null;
};
type AgreementFetchRow = Database["public"]["Tables"]["agreements"]["Row"] & {
  practitioner: { name: string; role: string } | null;
};
type PhotoRow = Database["public"]["Tables"]["photo_submissions"]["Row"] & {
  practitioner_name: string;
};

async function getData() {
  const db = createAdminClient();
  const [practitioners, sessions, sessionFeedback, requests, payouts, agreementsRes, photosRes] = await Promise.all([
    db.from("practitioners").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("sessions").select("*, practitioner:practitioners(name, email)").is("deleted_at", null).order("session_date", { ascending: false }).limit(200),
    db.from("session_feedback").select("id, session_id, overall_rating"),
    db.from("session_requests").select("*, assigned_practitioner:practitioners(name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("payouts").select("*, session:sessions(ref_code, module, session_date), practitioner:practitioners(name, upi_id, bank_account, bank_name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("agreements").select("*, practitioner:practitioners(name, role)").is("deleted_at", null).order("signed_at", { ascending: false }).limit(200),
    db.from("photo_submissions").select("*").order("submitted_at", { ascending: false }).limit(200),
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
  const sessionsWithFeedback: SessionRow[] = (sessions.data ?? []).map((s) => ({
    ...s,
    session_feedback: feedbackBySession[s.id] ? [feedbackBySession[s.id]] : [],
    photos_submitted: s.ref_code ? refsWithPhotos.has(s.ref_code) : false,
  })) as SessionRow[];

  // Build ref→name map from already-fetched practitioners — zero extra queries
  const nameByRef: Record<string, string> = {};
  for (const p of practitioners.data ?? []) {
    if (p.ref_code) nameByRef[p.ref_code] = p.name;
  }
  // Photos query failure is non-fatal — show empty state rather than crashing the admin
  const photos: PhotoRow[] = (photosRes.data ?? []).map((p) => ({
    ...p,
    practitioner_name: nameByRef[p.practitioner_ref] ?? p.practitioner_ref,
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
    ...p,
    subsection_averages: avgByPractitioner[p.id] ?? null,
  }));

  return {
    practitioners: practitionersWithAverages,
    sessions: sessionsWithFeedback,
    requests: (requests.data ?? []) as RequestRow[],
    payouts: (payouts.data ?? []) as PayoutRow[],
    agreements,
    photos,
  };
}

export default async function ConsolePage() {
  const { practitioners, sessions, requests, payouts, agreements, photos } = await getData();
  return (
    <AdminConsoleView
      practitioners={practitioners}
      sessions={sessions}
      requests={requests}
      payouts={payouts}
      agreements={agreements}
      photos={photos}
      email={process.env.ADMIN_EMAIL}
    />
  );
}
