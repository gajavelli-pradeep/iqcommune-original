import type { Metadata } from "next";
import { verifyRatingToken } from "@/lib/hmac";
import { createAdminClient } from "@/lib/supabase/admin";
import { RatingForm } from "@/components/public/RatingForm";

export const metadata: Metadata = {
  title: { absolute: "iqcommune — Rate Your Practitioner" },
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ background: "var(--surface-soft)", minHeight: "100vh" }}>
      <nav
        className="ob-nav"
        style={{
          height: 68,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,17,23,0.10)",
          padding: "0 2rem",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <span style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
            <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.04em" }}>iq</span>
            <span style={{ color: "var(--ink)", fontWeight: 300, fontSize: 24, letterSpacing: "-0.04em" }}>commune</span>
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--gold-dark)",
              background: "var(--gold-light)",
              border: "1px solid var(--gold-border)",
              padding: "3px 10px",
              borderRadius: 100,
            }}
          >
            Session Feedback
          </span>
        </div>
      </nav>
      {children}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.5rem 3rem", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6 }}>
          Confidential · Questions? Reply to the email this link was sent from, or write to hello@iqcommune.com
        </p>
      </div>
    </main>
  );
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>{title}</h1>
      <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

type SessionRow = {
  ref_code: string;
  status: string;
  module: string | null;
  session_date: string | null;
  request_id: string | null;
  practitioner: { name: string } | null;
  // session_feedback.session_id is UNIQUE → PostgREST returns a to-one object.
  session_feedback: { overall_rating: number | null } | null;
};

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; token?: string }>;
}) {
  const { ref, token } = await searchParams;

  if (!ref || !token || !verifyRatingToken(ref, token)) {
    return (
      <Shell>
        <ErrorState
          title="This link isn't valid"
          body="The rating link is missing, expired, or has been tampered with. Please ask your iqcommune coordinator to resend it."
        />
      </Shell>
    );
  }

  const db = createAdminClient();
  const { data } = await db
    .from("sessions")
    .select("ref_code, status, module, session_date, request_id, practitioner:practitioners(name), session_feedback(overall_rating)")
    .eq("ref_code", ref)
    .is("deleted_at", null)
    .maybeSingle();
  const session = data as SessionRow | null;

  if (!session) {
    return (
      <Shell>
        <ErrorState title="Session not found" body="We couldn't find this session. Please contact your coordinator." />
      </Shell>
    );
  }

  // Requestor (SPOC) + city come from the linked request (no FK for a PostgREST
  // embed, so a second scoped query — same JS-join pattern as the console).
  let requestedBy: string | null = null;
  let city: string | null = null;
  if (session.request_id) {
    const { data: reqRow } = await db
      .from("session_requests")
      .select("name, city")
      .eq("id", session.request_id)
      .maybeSingle();
    requestedBy = reqRow?.name ?? null;
    city = reqRow?.city ?? null;
  }

  const alreadyRated = (session.session_feedback?.overall_rating ?? null) != null;

  return (
    <Shell>
      <RatingForm
        refCode={session.ref_code}
        token={token}
        practitionerName={session.practitioner?.name ?? "the practitioner"}
        module={session.module}
        sessionDate={session.session_date}
        city={city}
        requestedBy={requestedBy}
        alreadyRated={alreadyRated}
      />
    </Shell>
  );
}
