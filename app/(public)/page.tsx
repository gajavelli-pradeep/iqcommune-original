import type { Metadata } from "next";
import Link from "next/link";
import { RequestModal } from "@/components/public/RequestModal";

export const metadata: Metadata = {
  title: "iqcommune — Finance Learning Sessions",
  description:
    "In-person finance sessions led by practitioners. No products. No pitch. Just knowledge.",
};

const MODULES = [
  { name: "Stock Market Basics", icon: "📈" },
  { name: "Mutual Funds & SIPs", icon: "💼" },
  { name: "Personal Finance Planning", icon: "🧮" },
  { name: "Tax Planning & ITR Filing", icon: "📋" },
  { name: "Real Estate Investing", icon: "🏠" },
  { name: "Insurance Planning", icon: "🛡️" },
  { name: "Retirement & NPS", icon: "🌅" },
  { name: "Budgeting & Debt Management", icon: "📊" },
  { name: "Estate Planning & Nomination", icon: "📜" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Submit a request",
    body: "Tell us the topic, your team size, and preferred dates. We handle the rest.",
  },
  {
    step: "02",
    title: "We match a practitioner",
    body: "A vetted finance professional is matched — no one is ever pitched to your employees.",
  },
  {
    step: "03",
    title: "Session happens",
    body: "In-person session at your office or a venue of your choice. Interactive, not lecture-style.",
  },
  {
    step: "04",
    title: "You pay, they're paid",
    body: "Clean payout with TDS compliance handled transparently. No hidden fees.",
  },
];

const WHY_LINES = [
  "Practitioners are anonymous publicly — no marketing for them, no noise for you.",
  "Every session is educational only — no product pitches permitted.",
  "Verified conflict-of-interest check before every empanelment.",
  "TDS (Section 194J) computed and documented for every payout.",
  "Separate per-session consent from the practitioner before you confirm.",
];

export default function HomePage() {
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
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "#0f1117" }}>
          iqcommune
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/practitioners" style={{ fontSize: 13, color: "#4a4d5c", fontWeight: 500 }}>
            Become a Practitioner
          </Link>
          <RequestModal />
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "6rem 2rem 4rem",
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
            marginBottom: 24,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Finance Learning for your Organisation
        </div>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.75rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#0f1117",
            marginBottom: 20,
          }}
        >
          Real practitioners.
          <br />
          Real sessions.
          <br />
          <span style={{ color: "#c9982a" }}>No products. No pitch.</span>
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#4a4d5c",
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 36px",
          }}
        >
          iqcommune connects organisations with vetted finance professionals for
          in-person learning sessions — on stock markets, tax planning, insurance,
          and more.
        </p>
        <RequestModal />
      </section>

      {/* Modules */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "2rem 2rem 5rem",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            color: "#9496a1",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Topics covered
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.name}
              style={{
                background: "#fff",
                border: "1px solid rgba(15,17,23,.09)",
                borderRadius: 10,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                fontWeight: 500,
                color: "#0f1117",
              }}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              {m.name}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          background: "#0f1117",
          padding: "5rem 2rem",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: 48,
            }}
          >
            How iqcommune works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#c9982a",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  STEP {item.step}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#fff",
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.65 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why iqcommune */}
      <section
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "5rem 2rem",
        }}
      >
        <h2
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 32,
          }}
        >
          Built with trust as the default
        </h2>
        <div style={{ display: "grid", gap: 14 }}>
          {WHY_LINES.map((line, i) => (
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
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "#c9982a",
          padding: "4rem 2rem",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
            marginBottom: 14,
          }}
        >
          Ready to run a finance session for your team?
        </h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.75)", marginBottom: 28 }}>
          Takes 2 minutes. We match a practitioner within 2–3 working days.
        </p>
        <RequestModal />
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#0f1117",
          color: "rgba(255,255,255,.4)",
          padding: "2rem",
          textAlign: "center",
          fontSize: 13,
        }}
      >
        <div>
          © {new Date().getFullYear()} iqcommune &nbsp;·&nbsp;{" "}
          <Link href="/practitioners" style={{ color: "rgba(255,255,255,.5)" }}>
            Practitioners
          </Link>
        </div>
      </footer>
    </main>
  );
}
