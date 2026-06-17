import type { Metadata } from "next";
import { ApplicationForm } from "@/components/public/ApplicationForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Become a Practitioner | iqcommune",
  description:
    "Join iqcommune as a finance practitioner. Share your expertise in in-person sessions. No products, no pitch — just knowledge transfer.",
};

const WHAT_YOU_GET = [
  "A session fee paid within 7 working days",
  "Full anonymity until you choose to disclose identity",
  "TDS handled transparently with full documentation",
  "Flexible schedule — you choose which sessions to accept",
  "Structured per-session consent so you're always in control",
];

const WHO_QUALIFIES = [
  "CFPs, CAs, wealth managers, equity analysts",
  "Insurance or estate planning professionals",
  "Bankers and financial advisors with teaching experience",
  "Anyone with 3+ years in personal or institutional finance",
];

export default function PractitionersPage() {
  return (
    <main style={{ background: "#fafaf9", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          background: "#fafaf9",
          borderBottom: "1px solid rgba(15,17,23,.08)",
          padding: "0 2rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(10px)",
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "#0f1117" }}
        >
          iqcommune
        </Link>
        <Link
          href="/"
          style={{ fontSize: 13, color: "#4a4d5c", fontWeight: 500 }}
        >
          ← Back to home
        </Link>
      </nav>

      {/* Hero */}
      <section
        style={{
          background: "#0f1117",
          padding: "5rem 2rem 4rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            color: "#c9982a",
            background: "rgba(201,152,42,.1)",
            border: "1px solid rgba(201,152,42,.25)",
            borderRadius: 100,
            padding: "4px 14px",
            marginBottom: 20,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Practitioner Application
        </div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: 16,
          }}
        >
          Share what you know.
          <br />
          <span style={{ color: "#c9982a" }}>Get paid for it.</span>
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.6)",
            lineHeight: 1.65,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          iqcommune connects finance professionals with organisations looking for
          genuine, no-pitch financial education for their teams.
        </p>
      </section>

      {/* Two-column: What you get + Who qualifies */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "4rem 2rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
            What you get
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {WHAT_YOU_GET.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  fontSize: 14,
                  color: "#4a4d5c",
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#eef7ee",
                    color: "#2a6b2a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                    fontSize: 11,
                  }}
                >
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
            Who can apply
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {WHO_QUALIFIES.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  fontSize: 14,
                  color: "#4a4d5c",
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  →
                </span>
                {item}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              padding: "1rem 1.25rem",
              background: "#faeeda",
              border: "1px solid #fac775",
              borderRadius: 10,
              fontSize: 13,
              color: "#854f0b",
              lineHeight: 1.65,
            }}
          >
            <strong>Important:</strong> All practitioners are subject to a
            conflict-of-interest review. You will need to confirm that this
            engagement doesn't violate your employer&apos;s policies before signing
            the empanelment agreement.
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section
        style={{
          background: "#fff",
          border: "1px solid rgba(15,17,23,.09)",
          borderRadius: 14,
          padding: "2.5rem 2rem",
          maxWidth: 780,
          margin: "0 auto 5rem",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Apply to join
          </h2>
          <p style={{ fontSize: 14, color: "#9496a1", marginTop: 6 }}>
            We review every application within 2–3 working days.
          </p>
        </div>
        <ApplicationForm />
      </section>
    </main>
  );
}
