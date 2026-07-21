"use client";

import { useState } from "react";

import { formatInr } from "./format";
import { ResultBox, ResultGrid, ToolCard, ToolNote, ToolPanel, ToolSlider } from "./ToolWidget";

/**
 * Tool 2 — Retirement Corpus Calculator.
 *
 * The arithmetic is transcribed from the spec rather than corrected. Its
 * annuity term is unusual — with a 20-year window the discounting factor
 * collapses to ~1, so the corpus lands near 100× the inflated monthly expense.
 * That is the figure the client signed off on, and a "fixed" formula would
 * quietly show every visitor a different number than the approved page.
 */

const RETIREMENT_AGE = 60;
const INFLATION = 0.06;
const WITHDRAWAL_RETURN = 0.07;
const RETIREMENT_MONTHS = 240;
/** The spec treats 70% of monthly savings as a proxy for current spend. */
const EXPENSE_RATIO = 0.7;
const SIP_RETURN = 0.12;

function corpusRequired(monthlySavings: number, yearsToRetirement: number): number {
  const futureMonthlyExpense =
    monthlySavings * EXPENSE_RATIO * Math.pow(1 + INFLATION, yearsToRetirement);
  const discount =
    (1 - Math.pow((1 + WITHDRAWAL_RETURN) / (1 + INFLATION), -RETIREMENT_MONTHS)) /
    (WITHDRAWAL_RETURN / 12 - INFLATION / 12);
  return (futureMonthlyExpense * discount) / 12;
}

function monthlySipFor(corpus: number, yearsToRetirement: number): number {
  const monthlyRate = SIP_RETURN / 12;
  const months = yearsToRetirement * 12;
  return (corpus * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function RetirementCorpus() {
  const [age, setAge] = useState(32);
  const [monthlySavings, setMonthlySavings] = useState(20_000);

  const yearsToRetirement = RETIREMENT_AGE - age;
  const corpus = corpusRequired(monthlySavings, yearsToRetirement);

  return (
    <ToolCard
      module="Retirement & Goal-Based Planning"
      name="Retirement Corpus Calculator"
      description="Your age, monthly savings, and inflation. We calculate what you need at retirement and the SIP to get there."
    >
      <ToolPanel title="Retirement Corpus">
        <ToolSlider
          label="Current age"
          value={age}
          display={String(age)}
          min={22}
          max={55}
          step={1}
          onChange={setAge}
        />
        <ToolSlider
          label="Monthly savings"
          value={monthlySavings}
          display={formatInr(monthlySavings)}
          min={5_000}
          max={150_000}
          step={5_000}
          onChange={setMonthlySavings}
        />

        <ResultGrid columns={2}>
          <ResultBox label="Corpus needed" value={formatInr(corpus)} tone="warn" />
          <ResultBox
            label="SIP required"
            value={formatInr(monthlySipFor(corpus, yearsToRetirement))}
            tone="good"
          />
        </ResultGrid>

        <ToolNote>
          {yearsToRetirement} years to retirement. Assumed 6% inflation, 7% withdrawal-phase
          return, 20-year retirement window.
        </ToolNote>
      </ToolPanel>
    </ToolCard>
  );
}
