"use client";
import { useState } from "react";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I register if I have a group?",
    a: "One person from your group registers as the SPOC (primary contact) on behalf of everyone. You share the group size, topic, a preferred date window, and a venue if you have one in mind. We align a practitioner and confirm details with you directly. You then coordinate within your group — we handle everything else.",
  },
  {
    q: "Will the practitioner try to sell me financial products?",
    a: "No. This is a firm policy, not a preference. During sessions, our practitioners are here purely to educate — no cross-selling, no product pitching, no collecting attendee details for commercial purposes. They have no commercial arrangement with any fund house, brokerage, or insurance company through this programme. The session is about frameworks, concepts, and your questions — nothing else. That said, practitioners are real professionals and you are adults — any interaction or connection that happens outside the session, on a voluntary basis, is entirely between you and them. We don't restrict that, and we don't pretend we can.",
  },
  {
    q: "Are these sessions affiliated with any AMFI, SEBI, or product entity?",
    a: "No. iqcommune is an independent platform. Our practitioners may personally hold relevant certifications (CFP, NISM, etc.), but the sessions are not conducted on behalf of any regulator, distributor, or product company. This independence is deliberate — it's what keeps the content product-agnostic.",
  },
  {
    q: "What exactly will I learn — and what won't be covered?",
    a: "Each session covers the framework and thinking behind a topic — not specific stock tips, fund recommendations, or portfolio advice. You'll leave understanding how to think about a problem, not with a list of things to buy. The practitioner will use real examples from their own work, but the goal is your literacy — not their portfolio.",
  },
  {
    q: "Where are the sessions held? Are they online?",
    a: "All sessions are in-person only. We believe the quality of conversation in a room — the ability to ask follow-up questions, read the room, and get a real-time answer — is central to how this works. The venue is confirmed after your group is formed and shared with you ahead of the session.",
  },
  {
    q: "Can my company book a session for a team?",
    a: (
      <>
        Yes. Organisational sessions work differently — you bring the group (your team), and we align the right practitioner around your schedule. This covers corporates, educational institutions, hospitals, media &amp; production houses, and any organisation looking to upskill its people. Sessions are tailored to your workforce&apos;s financial literacy level and specific needs. Please note that venue and basic infrastructure are to be arranged by your organisation. Use the &ldquo;Request a Session&rdquo; form and select <strong>Organisations &amp; Institutions</strong> as your audience type — we&apos;ll take it from there.
      </>
    ),
  },
  {
    q: "How is the practitioner chosen for my session?",
    a: "We match the practitioner to the module by current role — not just credentials. Someone teaching Stock Market Basics is an active equity analyst. Someone covering Goal-Based Investing is currently structuring client portfolios. The match is made internally before we confirm your session details.",
  },
  {
    q: "Who arranges the venue?",
    a: (
      <>
        It depends on your audience type.
        <br /><br />
        <strong>Groups</strong> — If your group has a preferred space — a society clubhouse, an office room, a community hall — that&apos;s always welcome and we&apos;ll gladly use it. If not, don&apos;t worry at all. We&apos;ll find and book a suitable venue in your city and share the details with the SPOC well ahead of the session.
        <br /><br />
        <strong>Organisations &amp; Institutions</strong> (corporates, educational institutions, hospitals, media houses) — the venue and basic infrastructure (seating, projector or screen) are to be arranged by your organisation. This gives you flexibility to host the session in a familiar setting for your team. We handle the practitioner, content, and delivery.
        <br /><br />
        <strong>AMCs &amp; Wealth Firms</strong> — venue and setup are on your end. You know your space and your audience best. We focus entirely on the content and the practitioner match.
      </>
    ),
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            style={{
              border: "1px solid rgba(15,17,23,0.10)",
              borderRadius: 12,
              background: "#ffffff",
              marginBottom: "0.75rem",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                padding: "1.1rem 1.4rem",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                color: "#0f1117",
                userSelect: "none",
                background: isOpen ? "#f8f7f4" : "transparent",
                border: "none",
                textAlign: "left",
                transition: "background 0.15s ease",
              }}
            >
              <span>{faq.q}</span>
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="#9496a1"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.22s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Height is driven entirely by inline style — no CSS class dependency */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: isOpen ? 1000 : 0,
                opacity: isOpen ? 1 : 0,
                transition: "max-height 0.35s ease, opacity 0.25s ease",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.4rem 1.1rem",
                  fontSize: 14,
                  color: "#4a4d5c",
                  lineHeight: 1.7,
                  borderTop: "1px solid rgba(15,17,23,0.10)",
                }}
              >
                {faq.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
