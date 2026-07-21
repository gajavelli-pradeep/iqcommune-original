"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Nine FAQs, single-open accordion — opening one closes the rest, and clicking
 * an open question closes it, matching the spec's toggleFaq.
 *
 * Accessibility the spec's version lacks: each question is a real button with
 * aria-expanded and aria-controls, and the answer is a labelled region. The
 * spec toggles a class on a div, which tells a screen reader nothing.
 *
 * Answers stay in the DOM when collapsed. An accordion is progressive
 * disclosure, not deletion — the parity gate must still find every word.
 */

const FAQS: ReadonlyArray<{ question: string; answer: ReactNode }> = [
  {
    question: "How do I register if I have a group?",
    answer:
      "One person from your group registers as the SPOC (primary contact) on behalf of everyone. You share the group size, topic, a preferred date window, and your venue details. We align a practitioner and confirm the schedule with you directly. Your group takes care of the venue — we handle the rest, from practitioner match to logistics on our end.",
  },
  {
    question: "Will the practitioner try to sell me financial products?",
    answer:
      "No. This is a firm policy, not a preference. During sessions, our practitioners are here purely to educate — no cross-selling, no product pitching, no collecting attendee details for commercial purposes. They have no commercial arrangement with any fund house, brokerage, or insurance company through this programme. The session is about frameworks, concepts, and your questions — nothing else. That said, practitioners are real professionals and you are adults — any interaction or connection that happens outside the session, on a voluntary basis, is entirely between you and them. We don't restrict that, and we don't pretend we can.",
  },
  {
    question: "Are these sessions affiliated with any AMFI, SEBI, or product entity?",
    answer:
      "No. iqcommune is an independent platform. Our practitioners may personally hold relevant certifications (CFP, NISM, etc.), but the sessions are not conducted on behalf of any regulator, distributor, or product company. This independence is deliberate — it's what keeps the content product-agnostic.",
  },
  {
    question: "What exactly will I learn — and what won't be covered?",
    answer:
      "Each session covers the framework and thinking behind a topic — not specific stock tips, fund recommendations, or portfolio advice. You'll leave understanding how to think about a problem, not with a list of things to buy. The practitioner will use real examples from their own work, but the goal is your literacy — not their portfolio.",
  },
  {
    question: "Where are the sessions held? Are they online?",
    answer:
      "All sessions are in-person only. We believe the quality of conversation in a room — the ability to ask follow-up questions, read the room, and get a real-time answer — is central to how this works. Your group finalises the venue once it's formed, and we build the session schedule around it.",
  },
  {
    question: "Can my company book a session for a team?",
    answer: (
      <>
        Yes. Organisational sessions work differently — you bring the group (your team), and
        we align the right practitioner around your schedule. This covers corporates,
        educational institutions, hospitals, media &amp; production houses, and any
        organisation looking to upskill its people. Sessions are tailored to your
        workforce&apos;s financial literacy level and specific needs. Please note that venue
        and basic infrastructure are to be arranged by your organisation. Use the
        &quot;Request a Session&quot; form and select{" "}
        <strong className="font-semibold text-ink">Organisations &amp; Institutions</strong>{" "}
        as your audience type — we&apos;ll take it from there.
      </>
    ),
  },
  {
    question: "Can sessions be bundled into a longer block?",
    answer:
      "Yes — for any audience. Two related modules can run back-to-back as a single 6-hour session, taught by one practitioner end to end. Three combinations are available: Foundations of Personal Finance paired with Retirement & Goal-Based Financial Planning; Equity Investing Simplified paired with Debt & Fixed Income Investing; or Asset Allocation & Portfolio Construction paired with Investment Solutions & Portfolio Strategies. Groups booking a bundle need a minimum of 9 participants (instead of the usual 5). Select your audience type and topic of interest in the \"Request a Session\" form and we'll confirm bundle availability with you.",
  },
  {
    question: "How is the practitioner chosen for my session?",
    answer:
      "We match the practitioner to the module by current role — not just credentials. Someone teaching Equity Investing Simplified is an active equity analyst. Someone covering Investment Solutions & Portfolio Strategies is currently structuring client portfolios. The match is made internally before we confirm your session details.",
  },
  {
    question: "Who arranges the venue?",
    answer: (
      <>
        It depends on your audience type.
        <br />
        <br />
        <strong className="font-semibold text-ink">Groups</strong> — Venue is your
        group&apos;s responsibility, same as our Organisation and AMC formats — a society
        clubhouse, an office room, a community hall, anything that fits. If you&apos;re not
        sure where to start, let us know your city and we&apos;re happy to point you to a few
        practical options other groups have used — the booking and any cost is on your group.
        <br />
        <br />
        <strong className="font-semibold text-ink">
          Organisations &amp; Institutions
        </strong>{" "}
        (corporates, educational institutions, hospitals, media houses) — the venue and basic
        infrastructure (seating, projector or screen) are to be arranged by your
        organisation. This gives you flexibility to host the session in a familiar setting
        for your team. We handle the practitioner, content, and delivery.
        <br />
        <br />
        <strong className="font-semibold text-ink">AMCs &amp; Wealth Firms</strong> — venue
        and setup are on your end. You know your space and your audience best. We focus
        entirely on the content and the practitioner match.
      </>
    ),
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className={`shrink-0 text-ink-faint transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <section className="bg-surface-soft px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="FAQs"
          headline="Things people ask before they sign up."
          sub="Honest answers — no fine print."
        />

        <ul className="mx-auto max-w-[780px]">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            const buttonId = `${baseId}-q${index}`;
            const panelId = `${baseId}-a${index}`;
            return (
              <li
                key={faq.question}
                className="mb-3 overflow-hidden rounded-lg border border-border bg-surface"
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className={`flex w-full items-center justify-between gap-4 px-[1.4rem] py-[1.1rem] text-left text-lg font-medium text-ink transition-colors hover:bg-surface-soft ${
                      open ? "bg-surface-soft" : ""
                    }`}
                  >
                    {faq.question}
                    <ChevronIcon open={open} />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!open}
                  className="border-t border-border px-[1.4rem] pt-4 pb-[1.1rem] text-md leading-[1.7] text-ink-muted"
                >
                  {faq.answer}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
