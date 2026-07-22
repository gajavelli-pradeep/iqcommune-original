import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The three audiences the product is sold to, each with its own sub-segments.
 *
 * Data-driven over AUDIENCES: three structurally identical cards differing only
 * in content, so one component renders all three.
 */

const AUDIENCES: ReadonlyArray<{
  name: string;
  description: string;
  tags: readonly string[];
  icon: ReactNode;
}> = [
  {
    name: "Groups",
    description:
      "Register as the SPOC (primary contact) on behalf of your group. You coordinate with us — we handle everything else.",
    tags: [
      "Friends & Family",
      "Colleagues",
      "Residential Communities",
      "Walking & Interest Groups",
      "Study Circles",
    ],
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    name: "Organisations & Institutions",
    description:
      "Any organisation looking to upskill its people on financial literacy — tailored to your workforce and context.",
    tags: ["Corporates", "Educational Institutions", "Hospitals", "Media & Production"],
    icon: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
  },
  {
    name: "AMCs & Wealth Firms",
    description:
      "Client education or new-joiner onboarding — led by practitioners from within the same industry.",
    tags: [
      "Client Education",
      "New Joiner Onboarding",
      "RM & Advisor Upskilling",
      "Investor Awareness Events",
    ],
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
];

export function WhoIsThisFor() {
  return (
    <section className="bg-surface px-8 pt-20 pb-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Who is this for"
          headline={
            <>
              Built for anyone serious
              <br />
              about financial literacy.
            </>
          }
          sub="Whether it's a group of friends, a corporate team, or a firm looking to upskill — we design the session around your audience."
        />

        <ul className="mt-8 flex flex-wrap justify-center gap-4">
          {AUDIENCES.map((audience) => (
            <li
              key={audience.name}
              /* Hover lift is gated behind @media (hover: hover) by Tailwind, so
                 touch devices are not left with a stuck hover state. */
              className="max-w-[240px] flex-[1_1_210px] rounded-lg border-[1.5px] border-border bg-surface-soft px-7 py-[1.6rem] transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-gold"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-gold-light text-gold-dark">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  {audience.icon}
                </svg>
              </div>
              <h3 className="mb-[5px] text-lg font-semibold text-ink">{audience.name}</h3>
              <p className="text-base leading-[1.5] text-ink-muted">{audience.description}</p>
              <ul className="mt-3 flex flex-wrap gap-[5px]">
                {audience.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-gold-border bg-gold-light px-[9px] py-[3px] text-xs font-medium text-gold-dark"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mt-7 text-center text-sm leading-[1.5] text-ink-faint">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
            className="-mt-0.5 mr-[5px] inline align-middle"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          All sessions capped at 25 participants — to keep the quality of conversation and
          interaction high.
        </p>
      </div>
    </section>
  );
}
