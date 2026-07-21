import { BudgetChecker } from "../tools/BudgetChecker";
import { DebtComparator } from "../tools/DebtComparator";
import { PortfolioScorecard } from "../tools/PortfolioScorecard";
import { RetirementCorpus } from "../tools/RetirementCorpus";
import { SipGrowth } from "../tools/SipGrowth";
import { ValuationCheck } from "../tools/ValuationCheck";

/**
 * The dark calculators band — six live tools, one per module.
 *
 * Not using SectionHeading: this section sits on ink, so the eyebrow, headline
 * and sub-line all invert. The lockup is otherwise identical.
 *
 * Calculators land one at a time; each is a self-contained client component so
 * only the tools ship JavaScript, not the section around them.
 */
export function ToolsCalculators() {
  return (
    <section className="bg-ink px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-page">
        <div className="mb-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-tool-chip-edge bg-tool-chip px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-bright">
            Tools &amp; Calculators
          </span>
        </div>
        <h2 className="mb-4 text-center text-[clamp(26px,3.8vw,40px)] font-semibold leading-[1.2] tracking-body text-surface">
          Try the numbers before you attend.
        </h2>
        <p className="mx-auto mb-12 max-w-[520px] text-center text-xl text-on-dark-muted">
          Six live calculators — one per module. Built on the same frameworks the sessions
          use. No sign-up, no data stored.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3">
          <BudgetChecker />
          <RetirementCorpus />
          <ValuationCheck />
          <DebtComparator />
          <PortfolioScorecard />
          <SipGrowth />
        </ul>
      </div>
    </section>
  );
}
