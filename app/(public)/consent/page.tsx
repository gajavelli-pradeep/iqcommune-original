import type { Metadata } from "next";
import { verifyConsentToken } from "@/lib/hmac";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConsentViewer, type ConfSnapshot } from "@/components/public/ConsentViewer";

export const metadata: Metadata = {
  title: "Session Revenue Consent",
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
          borderBottom: "1px solid rgba(20,18,12,0.10)",
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
            Session Consent
          </span>
        </div>
      </nav>
      {children}
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

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; token?: string }>;
}) {
  const { ref, token } = await searchParams;

  if (!ref || !token || !verifyConsentToken(ref, token)) {
    return (
      <Shell>
        <ErrorState
          title="This link isn't valid"
          body="The consent link is missing, expired, or has been tampered with. Please ask your iqcommune coordinator to resend it."
        />
      </Shell>
    );
  }

  const { data: conf } = await createAdminClient()
    .from("confirmations")
    .select("ref_code, status, snapshot")
    .eq("ref_code", ref)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conf) {
    return (
      <Shell>
        <ErrorState title="Confirmation not found" body="We couldn't find this revenue confirmation. Please contact your coordinator." />
      </Shell>
    );
  }

  return (
    <Shell>
      <ConsentViewer
        refCode={conf.ref_code}
        token={token}
        status={conf.status}
        snapshot={conf.snapshot as unknown as ConfSnapshot}
      />
    </Shell>
  );
}
