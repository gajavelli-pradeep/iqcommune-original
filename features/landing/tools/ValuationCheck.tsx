"use client";

import { useState } from "react";

import { formatInrExact, formatNumber } from "./format";
import {
  ResultBox,
  ResultGrid,
  ToolCard,
  ToolFlag,
  ToolPanel,
  ToolSlider,
} from "./ToolWidget";

/** Tool 3 — P/E Valuation Quick-Check. */

const MARKET_AVERAGE_PE = 22;

type Verdict = {
  label: string;
  tone: "good" | "warn" | "bad";
  message: string;
};

/**
 * One table drives the verdict box, its colour, and the flag beneath — the
 * spec set all three by hand in each branch, which is how they drift apart.
 */
function verdictFor(pe: number): Verdict {
  const shown = `${formatNumber(pe)}×`;
  if (pe < 15) {
    return {
      label: "Cheap",
      tone: "good",
      message: `P/E of ${shown} is below 15 — trading at a discount to the market. Worth investigating why.`,
    };
  }
  if (pe <= 28) {
    return {
      label: "Fair",
      tone: "warn",
      message: `P/E of ${shown} is in line with market. Valuation is not the edge here — earnings quality is.`,
    };
  }
  return {
    label: "Stretched",
    tone: "bad",
    message: `P/E of ${shown} is above 28 — priced for significant growth. Any miss will be punished.`,
  };
}

export function ValuationCheck() {
  const [price, setPrice] = useState(450);
  const [eps, setEps] = useState(22);

  const priceToEarnings = price / eps;
  const verdict = verdictFor(priceToEarnings);

  return (
    <ToolCard
      module="Equity Investing Simplified"
      name="P/E Valuation Quick-Check"
      description="Enter a stock's market price and EPS. Instant P/E verdict against the broad market benchmark."
    >
      <ToolPanel title="Valuation Check">
        <ToolSlider
          label="Market price (₹)"
          value={price}
          display={formatInrExact(price)}
          min={10}
          max={5_000}
          step={10}
          onChange={setPrice}
        />
        <ToolSlider
          label="EPS (₹)"
          value={eps}
          display={formatInrExact(eps)}
          min={1}
          max={500}
          step={1}
          onChange={setEps}
        />

        <ResultGrid columns={3}>
          <ResultBox label="P/E Ratio" value={`${formatNumber(priceToEarnings)}×`} />
          <ResultBox label="Market avg" value={`${MARKET_AVERAGE_PE}×`} />
          <ResultBox label="Verdict" value={verdict.label} tone={verdict.tone} />
        </ResultGrid>

        <ToolFlag tone={verdict.tone}>{verdict.message}</ToolFlag>
      </ToolPanel>
    </ToolCard>
  );
}
