import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The six teaching modules.
 *
 * The empanelment page carries what looks like the same six, but the two copies
 * are not verified identical yet — this data stays local to the landing feature
 * until P2 proves it, at which point it moves to constants/ as one source.
 * Extracting on a guess is how two lists silently drift apart.
 */

const MODULES: ReadonlyArray<{ name: string; description: string; icon: ReactNode }> = [
  {
    name: "Foundations of Personal Finance",
    description:
      "Budgeting, net worth, emergency funds, insurance, and tax basics — the complete foundation every adult needs before investing a single rupee.",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    name: "Retirement & Goal-Based Financial Planning",
    description:
      "Corpus calculation, NPS/EPF/PPF, goal-bucket planning, and handling competing financial goals — all in one session.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    name: "Equity Investing Simplified",
    description:
      "From how markets work to reading financials, valuation ratios, and earnings reports — taught by an active equity analyst, not a textbook.",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    name: "Debt & Fixed Income Investing",
    description:
      "Bonds, G-Secs, debt mutual funds, yield, duration, and tax treatment — the fixed income universe decoded by an active portfolio manager.",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    name: "Asset Allocation & Portfolio Construction",
    description:
      "How to split a portfolio across asset classes, build for your risk profile, and rebalance — taught by someone actively making these decisions for real clients.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 0 .5-3" />
      </>
    ),
  },
  {
    name: "Investment Solutions & Portfolio Strategies",
    description:
      "Mutual fund categories, SIP/STP/SWP mechanics, PMS and AIF, portfolio review frameworks, and tax-efficient investing — taught by a practising portfolio manager.",
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
  },
];

export function TrainingTopics() {
  return (
    <section className="bg-surface-soft px-8 py-20">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Training Topics"
          headline="What you'll learn."
          sub="Six focused modules — each led by a practitioner actively working in that specific area."
        />

        {/* 3 → 2 → 1 columns, at the spec's own 720px and 480px breakpoints. */}
        <ul className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3">
          {MODULES.map((module) => (
            <li
              key={module.name}
              className="rounded-lg border border-border bg-surface p-6 transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-gold"
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
                  {module.icon}
                </svg>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-ink">{module.name}</h3>
              <p className="text-base leading-[1.55] text-ink-muted">{module.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
