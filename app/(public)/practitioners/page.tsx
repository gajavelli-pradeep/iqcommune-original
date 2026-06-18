import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/public/ApplicationForm";

export const metadata: Metadata = {
  title: "Become a Practitioner | iqcommune",
  description:
    "Join iqcommune as a finance practitioner. Share your expertise through in-person sessions. No products, no pitch — just knowledge.",
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
  "Anyone with 5+ years in personal or institutional finance",
];

const COMPARISON_ROWS = [
  ["Speakers pitch products", "Zero product mentions, ever"],
  ["Your identity is your marketing", "Public anonymity — teach under credentials only"],
  ["Ad-hoc arrangements, no structure", "Signed agreement, per-session consent"],
  ["Payment via invoice negotiation", "Fixed fee structure, TDS documented"],
  ["No conflict-of-interest check", "COI review before every empanelment"],
];

export default function PractitionersPage() {
  return (
    <main style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* NAV */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 68,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,17,23,.10)",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                color: "#c9982a",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.04em",
              }}
            >
              iq
            </span>
            <span
              style={{
                color: "#0f1117",
                fontWeight: 300,
                fontSize: 22,
                letterSpacing: "-0.04em",
              }}
            >
              commune
            </span>
          </Link>
          <Link
            href="/"
            style={{ fontSize: 13, fontWeight: 500, color: "#4a4d5c", textDecoration: "none" }}
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          background: "#0f1117",
          padding: "5.5rem 2rem 5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decor blobs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -80,
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle, rgba(201,152,42,.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            background:
              "radial-gradient(circle, rgba(201,152,42,.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "rgba(201,152,42,.12)",
              color: "#f0c84a",
              border: "1px solid rgba(201,152,42,.25)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 100,
              marginBottom: 24,
            }}
          >
            Teach What You Practice
          </div>
          <h1
            style={{
              fontSize: "clamp(30px,4.5vw,52px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              marginBottom: 20,
            }}
          >
            Share what you know.
            <br />
            <span style={{ color: "#c9982a" }}>Get paid for it.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,.65)",
              maxWidth: 560,
              margin: "0 auto 36px",
              lineHeight: 1.65,
            }}
          >
            iqcommune connects finance professionals with organisations for
            in-person educational sessions. No product pitches. No conflicts.
            Just your expertise.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <a
              href="#apply-form"
              style={{
                background: "#c9982a",
                color: "#ffffff",
                border: "none",
                borderRadius: 100,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Apply Now →
            </a>
            <a
              href="#apply-form"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(255,255,255,.6)",
                textDecoration: "none",
              }}
            >
              Read the agreement
            </a>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            {[
              "5+ years experience required",
              "In-person sessions only",
              "Public anonymity maintained",
            ].map((text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,.5)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#c9982a",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ELIGIBILITY BAR */}
      <section
        style={{
          background: "#0a0c10",
          borderTop: "1px solid rgba(255,255,255,.08)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          padding: "1.25rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: "3rem",
            flexWrap: "wrap",
          }}
        >
          {[
            { num: "5+ years", label: "Minimum experience" },
            { num: "2–3 hours", label: "Per session duration" },
            { num: "Max 20", label: "Participants per session" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#c9982a",
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.num}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIFFERENTIATOR */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                display: "inline-flex",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8a6510",
                background: "#f5e9c8",
                border: "1px solid #e0c870",
                padding: "5px 14px",
                borderRadius: 100,
                marginBottom: 18,
              }}
            >
              Why We&apos;re Different
            </div>
            <h2
              style={{
                fontSize: "clamp(22px,3.2vw,34px)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "#0f1117",
                marginBottom: 12,
              }}
            >
              Why iqcommune is different
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "#4a4d5c",
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.65,
              }}
            >
              We&apos;re not a speaker bureau. We&apos;re a practitioner network
              built around one rule: teach only.
            </p>
          </div>
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              border: "1px solid rgba(15,17,23,.20)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div
                style={{
                  background: "#f8f7f4",
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9496a1",
                  borderBottom: "1px solid rgba(15,17,23,.20)",
                  borderRight: "1px solid rgba(15,17,23,.20)",
                }}
              >
                Other platforms
              </div>
              <div
                style={{
                  background: "#0f1117",
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  borderBottom: "1px solid rgba(15,17,23,.20)",
                }}
              >
                iqcommune
              </div>
            </div>
            {/* Rows */}
            {COMPARISON_ROWS.map(([left, right], i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
              >
                <div
                  style={{
                    padding: "1rem 1.75rem",
                    fontSize: 14,
                    color: "#4a4d5c",
                    borderBottom:
                      i < COMPARISON_ROWS.length - 1
                        ? "1px solid rgba(15,17,23,.10)"
                        : undefined,
                    borderRight: "1px solid rgba(15,17,23,.10)",
                  }}
                >
                  <span style={{ color: "#a32d2d", marginRight: 8 }}>✗</span>
                  {left}
                </div>
                <div
                  style={{
                    padding: "1rem 1.75rem",
                    fontSize: 14,
                    color: "#0f1117",
                    fontWeight: 500,
                    borderBottom:
                      i < COMPARISON_ROWS.length - 1
                        ? "1px solid rgba(15,17,23,.10)"
                        : undefined,
                  }}
                >
                  <span style={{ color: "#2a6b2a", marginRight: 8 }}>✓</span>
                  {right}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET + WHO QUALIFIES */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <style>{`
          .two-col-grid { display: grid; grid-template-columns: 1fr; gap: 3rem; }
          @media (min-width: 900px) { .two-col-grid { grid-template-columns: 1fr 1fr !important; } }
        `}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="two-col-grid">
            {/* What you get */}
            <div>
              <h2
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: "#0f1117" }}
              >
                What you get
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {WHAT_YOU_GET.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "#4a4d5c",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#eef7ee",
                        color: "#2a6b2a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                        fontSize: 12,
                      }}
                    >
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Who can apply */}
            <div>
              <h2
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: "#0f1117" }}
              >
                Who can apply
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {WHO_QUALIFIES.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "#4a4d5c",
                    }}
                  >
                    <span style={{ flexShrink: 0, marginTop: 1, fontSize: 16 }}>
                      →
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: "#faeeda",
                  border: "1px solid #fac775",
                  borderRadius: 10,
                  padding: "1rem 1.25rem",
                  fontSize: 13,
                  color: "#854f0b",
                  lineHeight: 1.65,
                  marginTop: 20,
                }}
              >
                <strong>Important:</strong> All practitioners undergo a
                conflict-of-interest review. You must confirm this engagement
                doesn&apos;t violate your employer&apos;s policies before
                signing the empanelment agreement.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section
        id="apply-form"
        style={{ background: "#ffffff", padding: "5rem 2rem" }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,17,23,.09)",
              borderRadius: 14,
              padding: "2.5rem 2rem",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                marginBottom: 8,
                color: "#0f1117",
              }}
            >
              Apply to join iqcommune
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#9496a1",
                marginBottom: 28,
              }}
            >
              We review every application carefully and respond within 2–3
              working days.
            </p>
            <ApplicationForm />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          background: "#080a0e",
          padding: "2rem",
          textAlign: "center",
          fontSize: 13,
          color: "rgba(255,255,255,.3)",
        }}
      >
        © {new Date().getFullYear()} iqcommune &nbsp;·&nbsp;{" "}
        <Link href="/practitioners" style={{ color: "rgba(255,255,255,.5)" }}>
          Practitioners
        </Link>
      </footer>
    </main>
  );
}
