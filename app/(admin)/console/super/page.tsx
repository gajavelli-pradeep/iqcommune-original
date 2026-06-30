import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminUser } from "@/lib/supabase/require-super-admin";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import type { Database } from "@/lib/supabase/database.types";
import type { Agreement } from "@/components/admin/AgreementTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Super Admin Console" };
export const dynamic = "force-dynamic";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
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
    db.from("practitioners").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("sessions").select("*, practitioner:practitioners(name, email)").order("session_date", { ascending: false }).limit(200),
    db.from("session_feedback").select("id, session_id, overall_rating"),
    db.from("session_requests").select("*, assigned_practitioner:practitioners(name)").order("created_at", { ascending: false }).limit(200),
    db.from("payouts").select("*, session:sessions(ref_code, module, session_date), practitioner:practitioners(name, upi_id, bank_account, bank_name)").order("created_at", { ascending: false }).limit(200),
    db.from("agreements").select("*, practitioner:practitioners(name, role)").order("signed_at", { ascending: false }).limit(200),
    db.from("photo_submissions").select("*").order("submitted_at", { ascending: false }).limit(200),
  ]);
  if (practitioners.error) throw new Error(`Practitioners load failed: ${practitioners.error.message}`);
  if (sessions.error)      throw new Error(`Sessions load failed: ${sessions.error.message}`);
  if (requests.error)      throw new Error(`Session requests load failed: ${requests.error.message}`);
  if (payouts.error)       throw new Error(`Payouts load failed: ${payouts.error.message}`);
  if (agreementsRes.error) throw new Error(`Agreements load failed: ${agreementsRes.error.message}`);

  const feedbackBySession = Object.fromEntries(
    (sessionFeedback.data ?? []).map((f) => [f.session_id, { id: f.id, overall_rating: f.overall_rating }])
  );
  const sessionsWithFeedback: SessionRow[] = (sessions.data ?? []).map((s) => ({
    ...s,
    session_feedback: feedbackBySession[s.id] ? [feedbackBySession[s.id]] : [],
  })) as SessionRow[];

  const nameByRef: Record<string, string> = {};
  for (const p of practitioners.data ?? []) {
    if (p.ref_code) nameByRef[p.ref_code] = p.name;
  }
  const photos: PhotoRow[] = (photosRes.data ?? []).map((p) => ({
    ...p,
    practitioner_name: nameByRef[p.practitioner_ref] ?? p.practitioner_ref,
  }));
  const agreements: Agreement[] = ((agreementsRes.data ?? []) as AgreementFetchRow[]).map((a) => ({
    ...a,
    practitioner_name: a.practitioner?.name ?? "—",
    practitioner_role: a.practitioner?.role ?? "—",
  }));
  return {
    practitioners: (practitioners.data ?? []) as PractitionerRow[],
    sessions: sessionsWithFeedback,
    requests: (requests.data ?? []) as RequestRow[],
    payouts: (payouts.data ?? []) as PayoutRow[],
    agreements,
    photos,
  };
}

export default async function SuperAdminPage() {
  const saUser = await getSuperAdminUser();
  if (!saUser) redirect("/console");

  const { practitioners, sessions, requests, payouts, agreements, photos } = await getData();
  return (
    <AdminConsoleView
      practitioners={practitioners}
      sessions={sessions}
      requests={requests}
      payouts={payouts}
      agreements={agreements}
      photos={photos}
      email={saUser.email}
      isSuperAdmin={true}
    />
  );
}
