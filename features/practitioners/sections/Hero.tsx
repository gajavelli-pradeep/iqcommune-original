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

const PERKS: ReadonlyArray<{ title: string; description: React.ReactNode; icon: React.ReactNode }> = [
  {
    title: "A room that's already interested",
    description:
      "20-25 people who've actively signed up to improve their financial literacy — no cold audience, no convincing anyone to be there. You bring the expertise and the presence; what happens next is yours to make of it.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    title: "The expensive part, already paid for",
    description:
      "Finding and reaching people who actually want to learn is usually the costliest part of building a practice. That part's on us — entirely.",
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
  },
  {
    title: "Earn on the side — with zero sales effort",
    description:
      "Revenue share per session. We bring the audience. You just show up and teach.",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "No content creation required",
    description:
      "You teach from your own experience. No slides to build, no curriculum to write.",
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
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
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    title: "Small, serious groups only",
    description: "Max 25 participants per session. Curated. In-person. No webinar crowds.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
];

/** The spec shows four perks before the fold (the first featured) and hides the rest. */
const VISIBLE_PERKS = 4;

export function Hero({ apply }: { apply: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative overflow-hidden border-b border-on-dark-divider bg-ink px-8 pt-[5.5rem] pb-20">
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

      <div className="relative mx-auto grid max-w-page items-start gap-16 min-[720px]:grid-cols-[1fr_420px]">
        <div>
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-tool-chip-edge bg-tool-chip px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-bright">
            <StarIcon />
            For Finance Professionals
          </span>

          <h1 className="mb-5 text-[clamp(32px,4.5vw,54px)] font-semibold leading-[1.12] tracking-tight text-surface">
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

          <p className="mb-8 max-w-[460px] text-lead leading-[1.65] text-on-dark-muted">
            iqcommune connects working finance professionals with people who want to learn from
            someone still in the field. You bring the knowledge. We handle everything else.
          </p>

          {apply}

          {/* `-muted`, not `-faint`. This is the reassurance directly under the
              apply button — no fees, no selling, when we reply — which is copy
              someone reads before deciding, not decoration. At 35% white it
              measured 3.2:1, under AA; `-muted` is the token documented for
              body text on ink, at 5.31:1. */}
          <p className="mt-4 flex items-center gap-1.5 text-base text-on-dark-muted">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
              focusable="false"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            No upfront fees. No sales work. We&apos;ll reach out within 2–3 working days.
          </p>
        </div>

        <div className="rounded-xl border border-tool-edge bg-tool-card p-8">
          {/* An eyebrow, which the faint token does list as one of its uses —
              but WCAG has no eyebrow exemption, and at 11px this was the
              lowest-contrast heading on the page. It labels the panel beneath
              it, so it is read rather than glanced past. */}
          <p className="mb-[1.1rem] text-xs font-semibold uppercase tracking-caps text-on-dark-muted">
            What this means for you
          </p>
          <ul>
            {PERKS.map((perk, index) => {
              const featured = index === 0;
              return (
                <li
                  key={perk.title}
                  hidden={!expanded && index >= VISIBLE_PERKS}
                  className={
                    featured
                      ? "mb-[0.15rem] flex items-start gap-3 rounded-[6px] border-l-2 border-l-gold bg-gold-glow px-3 py-[0.85rem]"
                      : "flex items-start gap-3 border-b border-on-dark-divider py-[0.85rem] last:border-b-0"
                  }
                >
                  <span
                    className={`mt-px flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-gold ${
                      featured ? "bg-gold-glow-strong" : "bg-tool-chip"
                    }`}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden
                      focusable="false"
                    >
                      {perk.icon}
                    </svg>
                  </span>
                  <div>
                    <p className="mb-0.5 text-base font-semibold text-surface">{perk.title}</p>
                    <p className="text-sm leading-[1.5] text-on-dark-muted">{perk.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="flex min-h-11 w-full items-center gap-1.5 pt-[0.85rem] text-[12.5px] font-semibold text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {expanded ? "Show less" : "Show more"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
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
