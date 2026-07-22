import { SectionHeading } from "@/components/ui/SectionHeading";

import { BudgetChecker } from "../tools/BudgetChecker";
import { DebtComparator } from "../tools/DebtComparator";
import { PortfolioScorecard } from "../tools/PortfolioScorecard";
import { RetirementCorpus } from "../tools/RetirementCorpus";
import { SipGrowth } from "../tools/SipGrowth";
import { ValuationCheck } from "../tools/ValuationCheck";

/**
 * The dark calculators band — six live tools, one per module. The header is the
 * shared SectionHeading in its dark tone (audit D-M).
 *
 * Calculators land one at a time; each is a self-contained client component so
 * only the tools ship JavaScript, not the section around them.
 */
export function ToolsCalculators() {
  return (
    <section className="bg-ink px-8 py-16">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tone="dark"
          tag="Tools & Calculators"
          headline="Try the numbers before you attend."
          sub="Six live calculators — one per module. Built on the same frameworks the sessions use. No sign-up, no data stored."
        />

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
