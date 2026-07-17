import { Suspense } from "react";
import { AgreementViewer } from "@/components/public/AgreementViewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practitioner Onboarding",
  robots: { index: false, follow: false },
};

function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-soft)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(20,18,12,.1)",
            borderTopColor: "var(--ink)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 14px",
          }}
        />
        <p style={{ fontSize: 14, color: "var(--ink-faint)" }}>Loading agreement…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <main style={{ background: "var(--surface-soft)", minHeight: "100vh" }}>
      {/* ── NAV ── */}
      <nav
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
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          {/* Logo: wordmark column + divider + stacked Practitioner/Network */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Left column: wordmark + tagline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Wordmark row */}
              <span style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
                <span
                  style={{
                    color: "#c9982a",
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: "-0.04em",
                  }}
                >
                  iq
                </span>
                <span
                  style={{
                    color: "var(--ink)",
                    fontWeight: 300,
                    fontSize: 24,
                    letterSpacing: "-0.04em",
                  }}
                >
                  commune
                </span>
              </span>
              {/* Tagline */}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  lineHeight: 1,
                }}
              >
                Where the insight quotient is unleashed
              </span>
            </div>
            {/* Vertical divider */}
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 1,
                height: 20,
                background: "rgba(20,18,12,0.20)",
                flexShrink: 0,
              }}
            />
            {/* Stacked Practitioner / Network */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8a6510",
                }}
              >
                Practitioner
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8a6510",
                }}
              >
                Network
              </span>
            </div>
          </div>

          {/* Right: "Onboarding" label + "Step 2 of 2" pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-faint)",
                fontWeight: 400,
              }}
            >
              Onboarding
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#8a6510",
                background: "#f5e9c8",
                border: "1px solid var(--gold-border)",
                borderRadius: 100,
                padding: "3px 10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Step 2 of 2
            </span>
          </div>
        </div>
      </nav>

      {/* ── AGREEMENT VIEWER (includes stepper) ── */}
      <Suspense fallback={<Loading />}>
        <AgreementViewer />
      </Suspense>
    </main>
  );
}
