import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TickIcon } from "@/components/ui/icons";

/**
 * What a participant leaves each module with — six cards, four deliverables each.
 *
 * The card titles are deliberately NOT the module names from TrainingTopics:
 * the spec shortens two of them here ("Retirement & Goal-Based Planning",
 * "Portfolio & Investment Strategies"). Copied as written rather than
 * normalised, since a heading that fits its card is an editorial choice.
 */

const TAKEAWAYS: ReadonlyArray<{ title: string; icon: ReactNode; items: readonly string[] }> = [
  {
    title: "Foundations of Personal Finance",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    items: [
      "A personal budget framework mapped to your actual income and expense pattern",
      "Net worth snapshot built in the session — with one specific step to improve it within 30 days",
      "Emergency fund target calculated for your household size and income stability",
      "A ranked financial to-do list — what to fix before the first rupee is invested",
    ],
  },
  {
    title: "Retirement & Goal-Based Planning",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    items: [
      "Your personal retirement corpus number — calculated in the room with your own age, lifestyle cost, and inflation assumption",
      "A NPS / PPF / EPF contribution plan mapped to your current income and retirement timeline",
      "A personal goal-bucket map — each major goal with a timeline, target amount, and instrument match",
      "Monthly SIP amounts needed per goal — calculated in the room with your own numbers",
    ],
  },
  {
    title: "Equity Investing Simplified",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    items: [
      "A stock evaluation template — P/E context, growth rate, moat assessment, and red flag checklist",
      "Ability to read a basic earnings report and extract what matters — practised in the session",
      "A watchlist of 3–5 companies started in the room using the practitioner's shortlisting framework",
      "One valuation ratio calibrated to the current market — what's cheap vs. expensive right now",
    ],
  },
  {
    title: "Debt & Fixed Income Investing",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    items: [
      "A fixed income allocation framework — how to decide what portion of your portfolio belongs in debt and in which instruments",
      "A debt instrument comparison guide — FD vs. debt fund vs. bond vs. G-Sec across risk, return, liquidity, and tax",
      "Clarity on how RBI rate decisions affect your fixed income holdings — with a simple response framework",
      "A tax-efficiency checklist for debt investments — how to minimise the tax drag on fixed income returns",
    ],
  },
  {
    title: "Asset Allocation & Portfolio Construction",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 0 .5-3" />
      </>
    ),
    items: [
      "A personal allocation framework — how to split your investable surplus across asset classes based on your risk profile and timeline",
      "A model portfolio structure (conservative / moderate / aggressive) as a starting reference",
      "A rebalancing trigger framework — simple rules for when and how to adjust the portfolio",
      "A checklist of portfolio construction pitfalls most retail investors make",
    ],
  },
  {
    title: "Portfolio & Investment Strategies",
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    items: [
      "A portfolio strategy document — your allocation across mutual fund categories, mapped to your risk profile and timeline",
      "A mutual fund shortlist framework — how to evaluate and compare funds within a category before committing",
      "A portfolio review checklist — what to look at, how often, and what triggers a change vs. staying the course",
      "A tax-efficiency action list — two or three moves to reduce the tax drag on your current portfolio",
    ],
  },
];


export function Takeaways() {
  return (
    <section className="bg-surface px-8 py-20">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tag="Takeaways"
          headline="What you walk out with."
          sub="Not notes. Not slides. A plan you can act on the same evening — built around your own numbers and goals."
        />

        <ul className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3">
          {TAKEAWAYS.map((card) => (
            <li
              key={card.title}
              className="overflow-hidden rounded-[12px] border border-border transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-gold"
            >
              <div className="flex items-center gap-2.5 bg-ink px-5 py-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="shrink-0 text-gold"
                >
                  {card.icon}
                </svg>
                <h3 className="text-base font-semibold leading-[1.3] text-surface">
                  {card.title}
                </h3>
              </div>
              <ul className="bg-surface px-5 py-[1.1rem]">
                {card.items.map((item) => (
                  <li
                    key={item}
                    className="mb-[0.6rem] flex items-start gap-[9px] text-base leading-[1.55] text-ink-muted last:mb-0"
                  >
                    <TickIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 flex max-w-[780px] items-start gap-3 rounded-r-[12px] border border-l-[3px] border-border border-l-gold bg-surface-soft px-6 py-4 text-md leading-[1.65] text-ink-muted">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            focusable="false"
            className="mt-[2px] shrink-0 text-gold-dark"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>
            <strong className="font-semibold text-ink">
              This isn&apos;t a certificate programme.
            </strong>{" "}
            There are no slides to take home. What you leave with is a working plan — built
            around your actual numbers, in the room, with a practitioner who can sense-check it
            on the spot.
          </span>
        </p>
      </div>
    </section>
  );
}
