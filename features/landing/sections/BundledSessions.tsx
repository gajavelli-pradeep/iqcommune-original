import { SectionHeading } from "@/components/ui/SectionHeading";
import { InfoCircleIcon } from "@/components/ui/icons";

/**
 * Three pairings that can be taught back-to-back as one six-hour sitting.
 *
 * Each pairing is a two-row list rather than free text, so the modules and their
 * durations stay aligned as the card narrows.
 */

const BUNDLES: ReadonlyArray<{ modules: readonly string[]; note: string }> = [
  {
    modules: [
      "Foundations of Personal Finance",
      "Retirement & Goal-Based Financial Planning",
    ],
    note: "A complete personal-finance-to-retirement arc — get the foundation right, then plan toward the goals it's funding.",
  },
  {
    modules: ["Equity Investing Simplified", "Debt & Fixed Income Investing"],
    note: "The two core asset classes covered together — how to evaluate and invest across equity and debt instruments in a single session.",
  },
  {
    modules: [
      "Asset Allocation & Portfolio Construction",
      "Investment Solutions & Portfolio Strategies",
    ],
    note: "Decide the allocation, then pick the instruments to execute it — strategy through to implementation in one session.",
  },
];

export function BundledSessions() {
  return (
    <section className="bg-surface px-8 pt-6 pb-20">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tag="Bundled Sessions"
          headline="Book one module or bundle two into one sitting."
          sub="Two related modules, taught back-to-back by one practitioner, as a single 6-hour session — open to every audience."
        />

        <ul className="mt-8 grid grid-cols-1 gap-[1.1rem] min-[480px]:grid-cols-3">
          {BUNDLES.map((bundle) => (
            <li
              key={bundle.modules.join("+")}
              className="rounded-[12px] border-[1.5px] border-border bg-surface-soft p-[1.6rem] transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-gold"
            >
              <p className="mb-4 text-xl font-semibold text-ink">6 hrs total</p>

              <ol className="mb-4">
                {bundle.modules.map((name, index) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2.5 border-b border-border py-[0.6rem] last:border-b-0"
                  >
                    {/* `min-w-0` so the title can wrap. A flex item's floor is
                        its content width unless told otherwise, so the longest
                        module name pushed the "3 hrs" pill past the right edge
                        and put the whole page into horizontal scroll at 480px. */}
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-xs font-bold text-gold-dark">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-semibold text-ink">{name}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-ink-faint">
                      3 hrs
                    </span>
                  </li>
                ))}
              </ol>

              <p className="text-base leading-[1.55] text-ink-muted">{bundle.note}</p>
            </li>
          ))}
        </ul>

        <p className="mt-7 text-center text-sm leading-[1.5] text-ink-faint">
          <InfoCircleIcon size={14} className="-mt-0.5 mr-[5px] inline align-middle" />
          Bundling is open to all audiences. Groups booking a bundle need a minimum of 9
          participants, instead of the usual 5, to make the longer session worthwhile.
        </p>
      </div>
    </section>
  );
}
