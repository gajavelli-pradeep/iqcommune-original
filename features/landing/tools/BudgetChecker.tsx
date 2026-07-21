"use client";

import { useState } from "react";
import {
  ResultBox,
  ResultGrid,
  SegmentBar,
  ToolCard,
  ToolFlag,
  ToolPanel,
  ToolSlider,
} from "./ToolWidget";
import { formatInr, futureValueOfAnnualContribution } from "./format";

/** The 50/30/20 split, and the ten-year value of the savings slice at 10%. */
const SPLIT = { needs: 0.5, wants: 0.3, savings: 0.2 } as const;
const PROJECTION_YEARS = 10;
const ASSUMED_ANNUAL_RETURN = 0.1;

export function BudgetChecker() {
  const [takeHome, setTakeHome] = useState(60_000);

  const savingsPerMonth = takeHome * SPLIT.savings;
  const savingsPerYear = savingsPerMonth * 12;
  const projected = futureValueOfAnnualContribution(
    savingsPerYear,
    PROJECTION_YEARS,
    ASSUMED_ANNUAL_RETURN,
  );

  return (
    <ToolCard
      module="Foundations of Personal Finance"
      name="50/30/20 Budget Checker"
      description="Enter your monthly take-home. See instantly how your spending maps against the 50/30/20 benchmark."
    >
      <ToolPanel title="Budget Checker">
        <ToolSlider
          label="Monthly take-home"
          value={takeHome}
          display={formatInr(takeHome)}
          min={15_000}
          max={300_000}
          step={5_000}
          onChange={setTakeHome}
        />

        <SegmentBar
          segments={[
            { label: "Needs", percent: 50, color: "var(--color-seg-needs)" },
            { label: "Wants", percent: 30, color: "var(--color-seg-wants)" },
            { label: "Savings", percent: 20, color: "var(--color-seg-savings)" },
          ]}
        />

        <ResultGrid columns={3}>
          <ResultBox label="Needs (50%)" value={formatInr(takeHome * SPLIT.needs)} />
          <ResultBox label="Wants (30%)" value={formatInr(takeHome * SPLIT.wants)} />
          <ResultBox label="Savings (20%)" value={formatInr(savingsPerMonth)} tone="good" />
        </ResultGrid>

        <ToolFlag tone="good">
          ₹{Math.round(savingsPerYear / 1000)}K/yr goes to savings — over{" "}
          {PROJECTION_YEARS} years at {ASSUMED_ANNUAL_RETURN * 100}% return that compounds to{" "}
          {formatInr(projected)}.
        </ToolFlag>
      </ToolPanel>
    </ToolCard>
  );
}
