import { createAdminClient } from "@/lib/supabase/admin";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import type { Database } from "@/lib/supabase/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Console | iqcommune" };
export const dynamic = "force-dynamic";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};
type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string } | null;
  practitioner: { name: string } | null;
};

async function getData() {
  const db = createAdminClient();
  const [practitioners, sessions, requests, payouts] = await Promise.all([
    db.from("practitioners").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("sessions").select("*, practitioner:practitioners(name, email)").order("session_date", { ascending: false }).limit(200),
    db.from("session_requests").select("*, assigned_practitioner:practitioners(name)").order("created_at", { ascending: false }).limit(200),
    db.from("payouts").select("*, session:sessions(ref_code, module), practitioner:practitioners(name)").order("created_at", { ascending: false }).limit(200),
  ]);
  return {
    practitioners: (practitioners.data ?? []) as PractitionerRow[],
    sessions: (sessions.data ?? []) as SessionRow[],
    requests: (requests.data ?? []) as RequestRow[],
    payouts: (payouts.data ?? []) as PayoutRow[],
  };
}

export default async function ConsolePage() {
  const { practitioners, sessions, requests, payouts } = await getData();

  const pendingPayouts = payouts.filter((p) => p.status === "Pending");
  const pendingPayoutGross = pendingPayouts.reduce((s, p) => s + ((p as unknown as { gross_amount?: number }).gross_amount ?? 0), 0);
  const pendingPayoutNet   = pendingPayouts.reduce((s, p) => s + ((p as unknown as { net_amount?: number }).net_amount ?? 0), 0);

  const confirmedSessions  = sessions.filter((s) => s.status === "Upcoming").length;
  const completedSessions  = sessions.filter((s) => s.status === "Completed").length;

  const counts = {
    applied:          practitioners.filter((p) => p.status === "Applied").length,
    empanelled:       practitioners.filter((p) => p.status === "Empanelled").length,
    pendingRequests:  requests.filter((r) => r.status === "New").length,
    pendingSessions:  sessions.filter((s) => s.status === "Upcoming").length,
    pendingPayouts:   pendingPayouts.length,
    pendingPayoutGross,
    pendingPayoutNet,
    confirmedSessions,
    completedSessions,
    totalRequests:    requests.length,
    matchedRequests:  requests.filter((r) => r.status === "Matched").length,
    confirmedRequests: requests.filter((r) => r.status === "Confirmed").length,
    totalPractitioners: practitioners.length,
    totalSessions:    sessions.length,
    totalPayouts:     payouts.length,
    paidPayouts:      payouts.filter((p) => p.status === "Paid").length,
  };

  return (
    <AdminConsoleView
      practitioners={practitioners}
      sessions={sessions}
      requests={requests}
      payouts={payouts}
      counts={counts}
    />
  );
}
