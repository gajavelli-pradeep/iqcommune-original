"use client";

import { useState } from "react";

import { formatInr } from "./format";
import {
  ResultBox,
  ResultGrid,
  ToolBars,
  ToolCard,
  ToolPanel,
  ToolSlider,
} from "./ToolWidget";

/** Tool 6 — SIP Growth Visualiser. */

const MAX_BARS = 10;
/** A bar for a near-zero balance still needs to read as a bar. */
const MIN_BAR_PERCENT = 11;

/** Future value of a monthly contribution, invested at the start of each month. */
function corpusAfter(monthlySip: number, months: number, monthlyRate: number): number {
  return monthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
}

function growthBars(monthlySip: number, years: number, monthlyRate: number) {
  const steps = Math.min(years, MAX_BARS);
  const values = Array.from({ length: steps }, (_, index) => {
    const months = Math.round((index + 1) * (years / steps)) * 12;
    return corpusAfter(monthlySip, months, monthlyRate);
  });
  const peak = Math.max(...values);

  return values.map((value, index) => ({
    key: `step-${index}`,
    heightPercent: Math.max(MIN_BAR_PERCENT, Math.round((value / peak) * 100)),
    title: formatInr(value),
  }));
}

export function SipGrowth() {
  const [monthlySip, setMonthlySip] = useState(10_000);
  const [years, setYears] = useState(15);
  const [annualReturn, setAnnualReturn] = useState(12);

  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;
  const invested = monthlySip * months;
  const corpus = corpusAfter(monthlySip, months, monthlyRate);

  return (
    <ToolCard
      module="Investment Solutions & Portfolio Strategies"
      name="SIP Growth Visualiser"
      description="Monthly SIP + years + return rate. Watch your corpus build year by year."
    >
      <ToolPanel title="SIP Growth">
        <ToolSlider
          label="Monthly SIP"
          value={monthlySip}
          display={formatInr(monthlySip)}
          min={1_000}
          max={100_000}
          step={1_000}
          onChange={setMonthlySip}
        />
        <ToolSlider
          label="Years"
          value={years}
          display={String(years)}
          min={3}
          max={30}
          step={1}
          onChange={setYears}
        />
        <ToolSlider
          label="Return %"
          value={annualReturn}
          display={`${annualReturn}%`}
          min={6}
          max={18}
          step={0.5}
          onChange={setAnnualReturn}
        />

        <ResultGrid columns={3}>
          <ResultBox label="Invested" value={formatInr(invested)} />
          <ResultBox label="Corpus" value={formatInr(corpus)} tone="good" />
          <ResultBox label="Gains" value={formatInr(corpus - invested)} tone="good" />
        </ResultGrid>

        <ToolBars bars={growthBars(monthlySip, years, monthlyRate)} />
      </ToolPanel>
    </ToolCard>
  );
}
