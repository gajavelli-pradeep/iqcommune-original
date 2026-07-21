import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The six teaching modules, plus the bundling note.
 *
 * Each module carries a second line naming who normally does this work — the
 * spec's way of saying "you already do this", so it is part of the card, not a
 * caption to be dropped on mobile.
 */

const MODULES: ReadonlyArray<{ title: string; description: string; taughtBy: string }> = [
  {
    title: "Foundations of Personal Finance",
    description:
      "Budgeting frameworks, net worth, emergency funds, insurance, and tax basics. Teaching people to get their foundation right before they invest anything.",
    taughtBy:
      "The conversation a financial planner or IFA has with every new client — opened up to a room of twenty-five.",
  },
  {
    title: "Retirement & Goal-Based Financial Planning",
    description:
      "Corpus calculation, NPS/EPF/PPF, and mapping investments to real goals — home, education, retirement.",
    taughtBy:
      "The plan a CFP or pension specialist builds for a client nearing a milestone — now for a room of twenty-five.",
  },
  {
    title: "Equity Investing Simplified",
    description:
      "How markets work, reading financials, valuation ratios, and earnings reports — the toolkit a retail investor needs.",
    taughtBy: "Taught by an active equity analyst, not a textbook.",
  },
  {
    title: "Debt & Fixed Income Investing",
    description: "Bonds, G-Secs, debt mutual funds, yield, duration, and tax treatment.",
    taughtBy: "The fixed income universe decoded by an active portfolio manager.",
  },
  {
    title: "Asset Allocation & Portfolio Construction",
    description:
      "How to split a portfolio across asset classes, build for risk profile, and rebalance.",
    taughtBy:
      "Taught by someone actively making these decisions for real clients — a portfolio manager or wealth manager.",
  },
  {
    title: "Investment Solutions & Portfolio Strategies",
    description:
      "Mutual fund categories, SIP/STP/SWP mechanics, PMS and AIF, portfolio review frameworks, and tax-efficient investing.",
    taughtBy: "Taught by a practising portfolio manager.",
  },
];

const PAIRINGS = [
  "Foundations + Retirement & Goals",
  "Equity + Debt & Fixed Income",
  "Asset Allocation + Investment Solutions",
] as const;

export function ModulesGrid() {
  return (
    <section className="bg-surface-soft px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Teaching modules"
          headline="Six modules. Teach one or several."
          sub="Each module maps to a distinct area of active practice. You can apply for one module or several — if your expertise spans a natural pairing, those two can be bundled as a single 6-hour session. We'll discuss and confirm what makes sense."
        />

        <ul className="mt-10 grid gap-4 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {MODULES.map((module) => (
            <li key={module.title} className="rounded-lg border border-border bg-surface p-5">
              <h3 className="mb-2 text-md font-semibold text-ink">{module.title}</h3>
              <p className="mb-3 text-sm leading-[1.6] text-ink-muted">{module.description}</p>
              <p className="border-t border-border pt-3 text-sm italic leading-[1.55] text-ink-faint">
                {module.taughtBy}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-r-lg border border-l-[3px] border-gold-border border-l-gold bg-gold-light px-6 py-5">
          <p className="mb-1 text-md font-semibold text-ink">
            Applying for two related modules? They can be bundled.
          </p>
          <p className="mb-4 text-base leading-[1.6] text-gold-dark">
            Three natural pairings run back-to-back as a single 6-hour session. If your expertise
            spans a pair, indicate that in your application and we&apos;ll discuss it.
          </p>
          <ol className="grid gap-2 min-[720px]:grid-cols-3">
            {PAIRINGS.map((pairing, index) => (
              <li key={pairing} className="flex items-baseline gap-2 text-base text-ink">
                <span className="text-sm font-semibold text-gold-dark">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {pairing}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
