import type { Metadata } from "next";
import Link from "next/link";
import { RequestModal } from "@/components/public/RequestModal";

export const metadata: Metadata = {
  title: { absolute: "iqcommune — Finance Learning Sessions" },
  description:
    "In-person finance sessions led by practitioners. No products. No pitch. Just knowledge.",
};

const MODULES = [
  { name: "Stock Market Basics", desc: "Listed equities, indices, how markets function." },
  { name: "Mutual Funds & SIPs", desc: "Fund categories, SIP mechanics, taxation." },
  { name: "Personal Finance Planning", desc: "Budgeting, goal-setting, net worth." },
  { name: "Tax Planning & ITR", desc: "Income slabs, deductions, filing process." },
  { name: "Real Estate Investing", desc: "REITs, property markets, financing." },
  { name: "Insurance Planning", desc: "Term, health, ULIPs, coverage gaps." },
  { name: "Retirement & NPS", desc: "Retirement corpus, NPS mechanics, annuity." },
  { name: "Budgeting & Debt", desc: "Cash-flow management, debt strategies." },
  { name: "Estate Planning", desc: "Nomination, will writing, succession." },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Submit a request",
    body: "Tell us the topic, team size, and preferred dates. 2-minute form.",
  },
  {
    step: "02",
    title: "We match a practitioner",
    body: "A vetted finance professional is matched — no products, no pitch.",
  },
  {
    step: "03",
    title: "Session happens",
    body: "In-person at your office or chosen venue. Interactive, not lecture-style.",
  },
  {
    step: "04",
    title: "You pay, they're paid",
    body: "Clean payout with TDS compliance handled. No hidden fees.",
  },
];

const WHY_LINES = [
  "Practitioners are anonymous publicly — no marketing for them, no noise for you.",
  "Every session is educational only — no product pitches permitted.",
  "Verified conflict-of-interest check before every empanelment.",
  "TDS (Section 194J) computed and documented for every payout.",
  "Separate per-session consent from the practitioner before you confirm.",
];

const FAQS = [
  {
    q: "How do you ensure practitioners don't pitch products?",
    a: "Every practitioner signs an empanelment agreement that explicitly prohibits product recommendations during sessions. We also conduct a pre-session briefing. Violations result in immediate removal from the network.",
  },
  {
    q: "What topics can we request?",
    a: "We cover 9 modules across personal and institutional finance — from stock market basics to estate planning. You can also request custom focus areas; we'll assess practitioner availability.",
  },
  {
    q: "How long does a session take?",
    a: "Standard sessions are 2–3 hours. Half-day workshops (4–5 hours) are available for larger groups or deeper topics.",
  },
  {
    q: "How are practitioners verified?",
    a: "Every applicant goes through: application review, a screening call, a conflict-of-interest check, and must sign a legal empanelment agreement before being listed.",
  },
  {
    q: "What does TDS compliance mean for us?",
    a: "We compute and document the TDS amount for every practitioner payment under Section 194J. You receive full documentation for your accounts team.",
  },
];

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "iqcommune",
  url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  description:
    "In-person finance sessions led by practitioners. No products. No pitch. Just knowledge.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@iqcommune.com",
    contactType: "customer service",
  },
};

export default function HomePage() {
  return (
    <main style={{ background: "#ffffff", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

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
          <div>
            <div>
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
            </div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9496a1",
                marginTop: 1,
              }}
            >
              Where financial intelligence connects
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link
              href="/practitioners"
              className="nav-secondary"
              style={{ fontSize: 13, fontWeight: 500, color: "#4a4d5c", textDecoration: "none" }}
            >
              Become a Practitioner
            </Link>
            <RequestModal />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          background: "#f8f7f4",
          borderBottom: "1px solid rgba(15,17,23,.10)",
          padding: "5rem 2rem 4.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>{`
          .hero-grid { display: grid; grid-template-columns: 1fr; }
          @media (min-width: 1000px) { .hero-grid { grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; } }
          .hero-card-col { display: none; }
          @media (min-width: 1000px) { .hero-card-col { display: block; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .hero-stagger { animation: fadeUp 0.5s ease both; }
        `}</style>
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 560,
            height: 560,
            background: "radial-gradient(circle, #f5e9c8 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div className="hero-grid">
            {/* Left column */}
            <div className="hero-stagger">
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
                  marginBottom: 24,
                }}
              >
                Finance Learning for Organisations
              </div>
              <h1
                style={{
                  fontSize: "clamp(30px,4.2vw,48px)",
                  fontWeight: 600,
                  lineHeight: 1.18,
                  letterSpacing: "-0.01em",
                  marginBottom: 20,
                  color: "#0f1117",
                }}
              >
                Real{" "}
                <span style={{ color: "#c9982a" }}>practitioners</span>.
                <br />
                Real sessions.
                <br />
                No products. No pitch.
              </h1>
              <p
                style={{
                  fontSize: 17,
                  color: "#4a4d5c",
                  maxWidth: 440,
                  marginBottom: 32,
                  lineHeight: 1.65,
                }}
              >
                iqcommune connects organisations with vetted finance professionals
                for in-person learning sessions — on investing, tax, insurance, and
                more.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  flexWrap: "wrap",
                  marginBottom: 24,
                }}
              >
                <RequestModal />
                <a
                  href="#how-it-works"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#4a4d5c",
                    textDecoration: "none",
                  }}
                >
                  See how it works →
                </a>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                  fontSize: 12,
                  color: "#9496a1",
                }}
              >
                <span>✓ No product pitches</span>
                <span>✓ Verified practitioners</span>
                <span>✓ TDS compliant</span>
              </div>
            </div>

            {/* Right column — hero card */}
            <div className="hero-card-col">
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15,17,23,.20)",
                  borderRadius: 20,
                  padding: "2rem",
                  boxShadow: "0 12px 48px rgba(0,0,0,.07)",
                  animation: "fadeUp 0.55s 0.3s ease both",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#8a6510",
                    marginBottom: "1.1rem",
                  }}
                >
                  Practitioner Pool
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 0,
                  }}
                >
                  {[
                    { num: "48+", label: "Practitioners" },
                    { num: "12+", label: "Topics covered" },
                    { num: "4.8★", label: "Avg. session rating" },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      style={{
                        textAlign: "center",
                        padding: "0.5rem 0",
                        borderRight: i < 2 ? "1px solid rgba(15,17,23,.10)" : undefined,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          color: "#0f1117",
                        }}
                      >
                        {stat.num}
                      </div>
                      <div style={{ fontSize: 11, color: "#4a4d5c", marginTop: 2 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: "1px solid rgba(15,17,23,.10)",
                    margin: "1rem 0",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    { title: "CFP", sub: "Certified Financial Planner" },
                    { title: "CA", sub: "Chartered Accountant" },
                    { title: "Equity Analyst", sub: "Research & Investing" },
                    { title: "Wealth Manager", sub: "Portfolio & Insurance" },
                  ].map((role) => (
                    <div
                      key={role.title}
                      style={{
                        background: "#f8f7f4",
                        borderRadius: 10,
                        padding: "0.75rem 0.9rem",
                      }}
                    >
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: "#0f1117" }}
                      >
                        {role.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#4a4d5c",
                          lineHeight: 1.4,
                          marginTop: 2,
                        }}
                      >
                        {role.sub}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: "1px solid rgba(15,17,23,.10)",
                    margin: "1rem 0",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#9496a1",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span>ℹ</span>
                  <span>
                    All practitioners are anonymous publicly — your employees only
                    see their credentials.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section
        style={{
          background: "#0f1117",
          color: "rgba(255,255,255,0.82)",
          padding: "0.9rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3rem",
            flexWrap: "wrap",
          }}
        >
          {[
            "5+ year minimum experience requirement",
            "Educational sessions only — zero product pitches",
            "TDS compliance handled and documented",
          ].map((text) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
              }}
            >
              <span style={{ color: "#c9982a", fontWeight: 700 }}>✓</span>
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* TOPICS */}
      <section id="topics" style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <style>{`
          .module-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
          @media (min-width: 640px) { .module-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1024px) { .module-grid { grid-template-columns: repeat(3, 1fr); } }
        `}</style>
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
              Topics Covered
            </div>
            <h2
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "#0f1117",
                marginBottom: 12,
              }}
            >
              Finance topics your team actually needs
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#4a4d5c",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.65,
              }}
            >
              We cover personal and institutional finance across 9 specialised
              modules.
            </p>
          </div>
          <div className="module-grid">
            {MODULES.map((m) => (
              <div
                key={m.name}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15,17,23,.09)",
                  borderRadius: 12,
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0f1117",
                    marginBottom: 6,
                  }}
                >
                  {m.name}
                </div>
                <div style={{ fontSize: 13, color: "#4a4d5c", lineHeight: 1.55 }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{ background: "#0f1117", padding: "5rem 2rem" }}
      >
        <style>{`
          .steps-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
          @media (min-width: 640px) { .steps-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1024px) { .steps-grid { grid-template-columns: repeat(4, 1fr); } }
        `}</style>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              marginBottom: 48,
            }}
          >
            How iqcommune works
          </h2>
          <div className="steps-grid">
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
                    color: "#ffffff",
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,.55)",
                    lineHeight: 1.65,
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY IQCOMMUNE */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#0f1117",
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
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <style>{`
          details summary::-webkit-details-marker { display: none; }
          details summary { list-style: none; }
          details[open] summary .faq-indicator::before { content: "−"; }
          details:not([open]) summary .faq-indicator::before { content: "+"; }
        `}</style>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
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
              FAQ
            </div>
            <h2
              style={{
                fontSize: "clamp(22px,3vw,32px)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "#0f1117",
                marginBottom: 10,
              }}
            >
              Frequently asked questions
            </h2>
            <p style={{ fontSize: 15, color: "#4a4d5c", lineHeight: 1.65 }}>
              Everything organisations need to know before booking.
            </p>
          </div>
          {FAQS.map((faq, i) => (
            <details
              key={i}
              style={{
                border: "1px solid rgba(15,17,23,.10)",
                borderRadius: 12,
                background: "#ffffff",
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  padding: "1.1rem 1.4rem",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#0f1117",
                }}
              >
                <span>{faq.q}</span>
                <span
                  className="faq-indicator"
                  style={{
                    fontSize: 18,
                    color: "#9496a1",
                    flexShrink: 0,
                    marginLeft: 12,
                    lineHeight: 1,
                  }}
                />
              </summary>
              <p
                style={{
                  padding: "0 1.4rem 1.2rem",
                  fontSize: 14,
                  color: "#4a4d5c",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section
        style={{
          background: "#0f1117",
          padding: "5rem 2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              background: "rgba(201,152,42,.15)",
              color: "#f0c84a",
              border: "1px solid rgba(201,152,42,.3)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            For Organisations
          </div>
          <h2
            style={{
              fontSize: "clamp(24px,3vw,36px)",
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              marginTop: 0,
              marginBottom: 14,
            }}
          >
            Ready to run a finance session for your team?
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,.6)",
              marginBottom: 32,
              lineHeight: 1.65,
            }}
          >
            Takes 2 minutes to request. We match a practitioner within 2–3
            working days.
          </p>
          <RequestModal />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            {[
              "No long-term commitment",
              "Anonymous practitioners",
              "TDS documented",
            ].map((text) => (
              <span
                key={text}
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,.4)",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {text}
              </span>
            ))}
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
