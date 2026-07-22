import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The six teaching modules, plus the bundling note.
 *
 * Each module's "taught by" clause is an inline gold-dark <strong> closing the
 * description — the spec's way of saying "you already do this" — not a separate
 * caption to be dropped on mobile.
 */

const MODULES: ReadonlyArray<{
  title: string;
  description: string;
  taughtBy: string;
  icon: React.ReactNode;
}> = [
  {
    title: "Foundations of Personal Finance",
    description:
      "Budgeting frameworks, net worth, emergency funds, insurance, and tax basics. Teaching people to get their foundation right before they invest anything.",
    taughtBy:
      "The conversation a financial planner or IFA has with every new client — opened up to a room of twenty-five.",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    title: "Retirement & Goal-Based Financial Planning",
    description:
      "Corpus calculation, NPS/EPF/PPF, and mapping investments to real goals — home, education, retirement.",
    taughtBy:
      "The plan a CFP or pension specialist builds for a client nearing a milestone — now for a room of twenty-five.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    title: "Equity Investing Simplified",
    description:
      "How markets work, reading financials, valuation ratios, and earnings reports — the toolkit a retail investor needs.",
    taughtBy: "Taught by an active equity analyst, not a textbook.",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    title: "Debt & Fixed Income Investing",
    description: "Bonds, G-Secs, debt mutual funds, yield, duration, and tax treatment.",
    taughtBy: "The fixed income universe decoded by an active portfolio manager.",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "Asset Allocation & Portfolio Construction",
    description:
      "How to split a portfolio across asset classes, build for risk profile, and rebalance.",
    taughtBy:
      "Taught by someone actively making these decisions for real clients — a portfolio manager or wealth manager.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 0 .5-3" />
      </>
    ),
  },
  {
    title: "Investment Solutions & Portfolio Strategies",
    description:
      "Mutual fund categories, SIP/STP/SWP mechanics, PMS and AIF, portfolio review frameworks, and tax-efficient investing.",
    taughtBy: "Taught by a practising portfolio manager.",
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
  },
];

const PAIRINGS = [
  "Foundations + Retirement & Goals",
  "Equity + Debt & Fixed Income",
  "Asset Allocation + Investment Solutions",
] as const;

export function ModulesGrid() {
  return (
    <section className="bg-surface px-8 py-16">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Teaching modules"
          headline="Six modules. Teach one or several."
          sub="Each module maps to a distinct area of active practice. You can apply for one module or several — if your expertise spans a natural pairing, those two can be bundled as a single 6-hour session. We'll discuss and confirm what makes sense."
        />

        <ul className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3">
          {MODULES.map((module) => (
            <li
              key={module.title}
              className="rounded-[12px] border-[1.5px] border-border p-5 transition-colors hover:border-gold"
            >
              <span className="mb-[0.85rem] flex h-10 w-10 items-center justify-center rounded-[9px] bg-gold-light text-gold-dark">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden
                  focusable="false"
                >
                  {module.icon}
                </svg>
              </span>
              <h3 className="mb-[7px] text-md font-semibold text-ink">{module.title}</h3>
              <p className="text-[12.5px] leading-[1.6] text-ink-muted">
                {module.description}{" "}
                <strong className="font-semibold text-gold-dark">{module.taughtBy}</strong>
              </p>
            </li>
          ))}
        </ul>

        {/* V7 .bundle-nudge — gold box: square icon, body, then white pill chips. */}
        <div className="mt-8 flex flex-col gap-3 rounded-[12px] border-[1.5px] border-gold-border bg-gold-light px-[1.4rem] py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-dark text-surface">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
              focusable="false"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[13.5px] font-semibold text-ink">
              Applying for two related modules? They can be bundled.
            </p>
            <p className="text-[12.5px] leading-[1.6] text-ink-muted">
              Three natural pairings run back-to-back as a single 6-hour session. If your expertise
              spans a pair, indicate that in your application and we&apos;ll discuss it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAIRINGS.map((pairing, index) => (
              <span
                key={pairing}
                className="flex items-center gap-1.5 rounded-full border border-gold-border bg-surface px-3 py-1 text-sm font-medium text-gold-dark"
              >
                <span className="text-2xs font-bold text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {pairing}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
