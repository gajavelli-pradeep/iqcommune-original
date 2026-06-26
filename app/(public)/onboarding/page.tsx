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

// Inline stepper — no separate file needed
function Stepper() {
  const steps: Array<{
    label: string;
    state: "done" | "active" | "pending";
    num: number;
  }> = [
    { label: "Application submitted", state: "done", num: 1 },
    { label: "Screening call done", state: "done", num: 2 },
    { label: "Review & sign agreement", state: "active", num: 3 },
    { label: "Empanelment confirmed", state: "pending", num: 4 },
  ];

  return (
    /* Flat flex row: step | arrow | step | arrow | step | arrow | step */
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
      {steps.map((step, i) => (
        <div key={step.num} style={{ display: "contents" }}>
          {/* Step item */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...(step.state === "done"
                  ? { background: "#2a6b2a", color: "#fff" }
                  : step.state === "active"
                  ? { background: "var(--ink)", color: "#fff" }
                  : {
                      background: "var(--surface-soft)",
                      border: "1.5px solid rgba(20,18,12,0.20)",
                      color: "var(--ink-faint)",
                    }),
              }}
            >
              {step.state === "done" ? (
                <svg
                  width={12}
                  height={12}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
                  {step.num}
                </span>
              )}
            </div>
            {/* Label */}
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                ...(step.state === "done"
                  ? { color: "#2a6b2a" }
                  : step.state === "active"
                  ? { color: "var(--ink)" }
                  : { color: "var(--ink-faint)" }),
              }}
            >
              {step.label}
            </span>
          </div>

          {/* Arrow connector between steps (not after the last one) */}
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              style={{
                color: "#d0d1d8",
                fontSize: 16,
                flexShrink: 0,
                userSelect: "none",
                margin: "0 0.75rem",
              }}
            >
              ›
            </span>
          )}
        </div>
      ))}
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
                Where financial intelligence connects
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

      {/* ── STEPPER ── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(20,18,12,0.10)",
          borderRadius: 12,
          padding: "1rem 1.5rem",
          maxWidth: 860,
          margin: "2.5rem auto 2.5rem",
        }}
      >
        <Stepper />
      </div>

      {/* ── AGREEMENT VIEWER ── */}
      <Suspense fallback={<Loading />}>
        <AgreementViewer />
      </Suspense>
    </main>
  );
}
