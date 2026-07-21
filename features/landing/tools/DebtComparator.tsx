"use client";

import { useState } from "react";

import { formatInr } from "./format";
import { ResultBox, ResultGrid, ToolCard, ToolNote, ToolPanel, ToolSlider } from "./ToolWidget";

/** Tool 4 — Post-Tax Return Comparator. */

const TAX_RATE = 0.3;

/**
 * All three instruments are taxed at the marginal rate: debt funds lost
 * indexation in the 2023 budget, so the comparison is now rate-versus-rate.
 */
const INSTRUMENTS = [
  { key: "fd", label: "FD (post-tax)", rate: 0.069, tone: "neutral" },
  { key: "mf", label: "Debt Fund", rate: 0.077, tone: "good" },
  { key: "gs", label: "G-Sec", rate: 0.073, tone: "good" },
] as const;

function postTaxValue(amount: number, rate: number, years: number): number {
  const grossGain = amount * (Math.pow(1 + rate, years) - 1);
  return amount + grossGain * (1 - TAX_RATE);
}

export function DebtComparator() {
  const [amount, setAmount] = useState(100_000);
  const [years, setYears] = useState(3);

  return (
    <ToolCard
      module="Debt & Fixed Income Investing"
      name="Post-Tax Return Comparator"
      description="FD vs. debt fund vs. G-Sec. Enter amount and tenure — see post-tax returns side by side."
    >
      <ToolPanel title="Debt Comparator">
        <ToolSlider
          label="Amount (₹)"
          value={amount}
          display={formatInr(amount)}
          min={10_000}
          max={1_000_000}
          step={10_000}
          onChange={setAmount}
        />
        <ToolSlider
          label="Tenure (years)"
          value={years}
          display={`${years} ${years > 1 ? "yrs" : "yr"}`}
          min={1}
          max={10}
          step={1}
          onChange={setYears}
        />

        <ResultGrid columns={3}>
          {INSTRUMENTS.map((instrument) => (
            <ResultBox
              key={instrument.key}
              label={instrument.label}
              value={formatInr(postTaxValue(amount, instrument.rate, years))}
              tone={instrument.tone}
            />
          ))}
        </ResultGrid>

        <ToolNote>
          Assumes 30% tax slab. Illustrative only — actual returns vary with rate cycles and
          tax slab.
        </ToolNote>
      </ToolPanel>
    </ToolCard>
  );
}
