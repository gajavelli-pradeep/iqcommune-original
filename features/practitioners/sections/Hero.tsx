"use client";

import { useState } from "react";

import { StarIcon } from "@/components/ui/icons";

/**
 * P2 hero — the pitch, plus the "what this means for you" card.
 *
 * The card's six perks collapse behind a Show more/Show less toggle exactly as
 * the spec does, but the hidden perks stay in the DOM: content that only exists
 * after a click is content a search engine and a JS-blocked browser never see.
 */

const PERKS: ReadonlyArray<{ title: string; description: React.ReactNode }> = [
  {
    title: "A room that's already interested",
    description:
      "20-25 people who've actively signed up to improve their financial literacy — no cold audience, no convincing anyone to be there. You bring the expertise and the presence; what happens next is yours to make of it.",
  },
  {
    title: "The expensive part, already paid for",
    description:
      "Finding and reaching people who actually want to learn is usually the costliest part of building a practice. That part's on us — entirely.",
  },
  {
    title: "Earn on the side — with zero sales effort",
    description:
      "Revenue share per session. We bring the audience. You just show up and teach.",
  },
  {
    title: "No content creation required",
    description:
      "You teach from your own experience. No slides to build, no curriculum to write.",
  },
  {
    title: "3–6 hours. Your schedule.",
    description: (
      <>
        Sessions are short, infrequent, and confirmed with you before anything is committed.{" "}
        <em className="italic">
          *6 hours only applies if you opt for a bundled session covering two modules.
        </em>
      </>
    ),
  },
  {
    title: "Small, serious groups only",
    description: "Max 25 participants per session. Curated. In-person. No webinar crowds.",
  },
];

/** The spec shows two perks before the fold and hides the rest. */
const VISIBLE_PERKS = 2;

export function Hero({ apply }: { apply: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative overflow-hidden border-b border-on-dark-divider bg-ink px-4 py-16 sm:px-8">
      {/* Decorative gold glows, top-right and bottom-left (V7 .hero::before/::after).
          aria-hidden and pointer-events-none: paint, not content. Dropped below
          720px, where they swamp a phone — the spec's own breakpoint. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[160px] -right-[120px] hidden h-[600px] w-[600px] min-[720px]:block"
        style={{ background: "radial-gradient(circle, var(--color-gold-glow) 0%, transparent 68%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[80px] -left-[80px] hidden h-[400px] w-[400px] min-[720px]:block"
        style={{ background: "radial-gradient(circle, var(--color-gold-glow-soft) 0%, transparent 68%)" }}
      />

      <div className="relative mx-auto grid max-w-page gap-10 min-[860px]:grid-cols-[1fr_minmax(0,420px)]">
        <div>
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-tool-chip-edge bg-tool-chip px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-bright">
            <StarIcon />
            For Finance Professionals
          </span>

          <h1 className="mb-5 text-[clamp(30px,4.6vw,46px)] font-semibold leading-[1.15] tracking-body text-surface">
            You spend your days
            <br />
            managing real money.
            <br />
            <em className="not-italic text-gold">
              Most people will never
              <br />
              learn from someone like you.
            </em>
          </h1>

          <p className="mb-8 max-w-[520px] text-lead leading-[1.65] text-on-dark-muted">
            iqcommune connects working finance professionals with people who want to learn from
            someone still in the field. You bring the knowledge. We handle everything else.
          </p>

          {apply}

          <p className="mt-4 text-base text-on-dark-muted">
            No upfront fees. No sales work. We&apos;ll reach out within 2–3 working days.
          </p>
        </div>

        <div className="rounded-lg border border-tool-edge bg-tool-card p-6">
          <p className="mb-4 text-2xs font-semibold uppercase tracking-caps text-gold-bright">
            What this means for you
          </p>
          <ul>
            {PERKS.map((perk, index) => (
              <li
                key={perk.title}
                hidden={!expanded && index >= VISIBLE_PERKS}
                className="mb-4 border-b border-on-dark-divider pb-4 last:mb-0 last:border-b-0 last:pb-0"
              >
                <p className="mb-1 text-base font-semibold text-surface">{perk.title}</p>
                <p className="text-sm leading-[1.6] text-on-dark-muted">{perk.description}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="mt-4 flex min-h-11 w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-caps text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {expanded ? "Show less" : "Show more"}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
              focusable="false"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
