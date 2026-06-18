import { createAdminClient } from "@/lib/supabase/admin";
import { PractitionerTable } from "@/components/admin/PractitionerTable";
import { SessionTable } from "@/components/admin/SessionTable";
import { RequestTable } from "@/components/admin/RequestTable";
import { PayoutTable } from "@/components/admin/PayoutTable";
import type { Database } from "@/lib/supabase/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Console" };

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

  // Limit to 200 rows per table. Full pagination is a future improvement.
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

  const counts = {
    applied: practitioners.filter((p) => p.status === "Applied").length,
    empanelled: practitioners.filter((p) => p.status === "Empanelled").length,
    pendingRequests: requests.filter((r) => r.status === "New").length,
    pendingPayouts: payouts.filter((p) => p.status === "Pending").length,
  };

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "New applications", value: counts.applied, color: "#534ab7" },
          { label: "Empanelled", value: counts.empanelled, color: "#2a6b2a" },
          { label: "Open requests", value: counts.pendingRequests, color: "#c9982a" },
          { label: "Payouts pending", value: counts.pendingPayouts, color: "#a32d2d" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "#fff",
              border: "1px solid rgba(15,17,23,.1)",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 13, color: "#9496a1", marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Practitioners */}
      <Section title="Practitioners" count={practitioners.length}>
        <PractitionerTable initialData={practitioners} />
      </Section>

      {/* Session Requests */}
      <Section title="Session Requests" count={requests.length}>
        <RequestTable initialData={requests} />
      </Section>

      {/* Sessions */}
      <Section title="Sessions" count={sessions.length}>
        <SessionTable initialData={sessions} />
      </Section>

      {/* Payouts */}
      <Section title="Payouts" count={payouts.length}>
        <PayoutTable initialData={payouts} />
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(15,17,23,.1)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid rgba(15,17,23,.07)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#9496a1",
            background: "#f8f7f4",
            border: "1px solid rgba(15,17,23,.08)",
            borderRadius: 100,
            padding: "2px 8px",
          }}
        >
          {count}
        </span>
      </div>
      <div style={{ padding: "1rem 1.5rem" }}>{children}</div>
    </div>
  );
}
