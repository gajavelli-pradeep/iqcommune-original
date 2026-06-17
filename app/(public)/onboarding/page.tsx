import { Suspense } from "react";
import { AgreementViewer } from "@/components/public/AgreementViewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practitioner Empanelment | iqcommune",
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
        background: "#fafaf9",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(15,17,23,.1)",
            borderTopColor: "#0f1117",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 14px",
          }}
        />
        <p style={{ fontSize: 14, color: "#9496a1" }}>Loading agreement…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <main style={{ background: "#fafaf9", minHeight: "100vh" }}>
      <nav
        style={{
          background: "#fafaf9",
          borderBottom: "1px solid rgba(15,17,23,.08)",
          padding: "0 2rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#0f1117",
          }}
        >
          iqcommune
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#c9982a",
            background: "rgba(201,152,42,.1)",
            border: "1px solid rgba(201,152,42,.25)",
            borderRadius: 100,
            padding: "3px 10px",
          }}
        >
          Practitioner Empanelment
        </span>
      </nav>
      <Suspense fallback={<Loading />}>
        <AgreementViewer />
      </Suspense>
    </main>
  );
}
