import { Suspense } from "react";
import { PhotoSubmissionForm } from "@/components/public/PhotoSubmissionForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Session Photos",
  robots: { index: false, follow: false },
};

function Loading() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 68px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(20,18,12,.1)",
            borderTopColor: "var(--ink)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// Progress stepper
function Stepper() {
  const steps = [
    { label: "Session completed", state: "done"    as const, num: 1 },
    { label: "Submit session photos", state: "active" as const, num: 2 },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
      {steps.map((step, i) => (
        <div key={step.num} style={{ display: "contents" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{step.num}</span>
              )}
            </div>
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
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              style={{
                color: "rgba(20,18,12,0.20)",
                fontSize: 14,
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

export default function SubmitPhotosPage() {
  return (
    <main style={{ background: "var(--surface-soft)", minHeight: "100vh" }}>
      {/* ── NAV ── */}
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
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
                <span style={{ color: "#c9982a", fontWeight: 700, fontSize: 24, letterSpacing: "-0.04em" }}>iq</span>
                <span style={{ color: "var(--ink)", fontWeight: 300, fontSize: 24, letterSpacing: "-0.04em" }}>commune</span>
              </span>
              <span
                className="ob-hide-mobile"
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  lineHeight: 1,
                }}
              >
                Practitioner Network
              </span>
            </div>
          </div>

          {/* Right: Post-Session badge */}
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
            Post-Session
          </span>
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
          margin: "2.5rem auto 2rem",
        }}
      >
        <Stepper />
      </div>

      {/* ── FORM ── */}
      <Suspense fallback={<Loading />}>
        <PhotoSubmissionForm />
      </Suspense>
    </main>
  );
}
