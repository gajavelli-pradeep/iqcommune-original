"use client";

import { useState } from "react";

import {
  ResultBox,
  ResultGrid,
  ToolCard,
  ToolChips,
  ToolFlag,
  ToolPanel,
  ToolSlider,
} from "./ToolWidget";

/** Tool 5 — Portfolio Balance Scorecard. */

const PROFILES = {
  Conservative: { equity: 30, debt: 55 },
  Moderate: { equity: 55, debt: 35 },
  Aggressive: { equity: 75, debt: 18 },
} as const;

type ProfileName = keyof typeof PROFILES;

const PROFILE_NAMES = Object.keys(PROFILES) as ProfileName[];

/** Ten points, less a fifth of a point for every point of drift on either leg. */
function balanceScore(equity: number, debt: number, profile: ProfileName): number {
  const target = PROFILES[profile];
  const drift = Math.abs(equity - target.equity) + Math.abs(debt - target.debt);
  return Math.round(Math.max(0, 10 - drift / 5) * 10) / 10;
}

function adviceFor(score: number, profile: ProfileName) {
  const target = PROFILES[profile];
  if (score >= 8) {
    return {
      tone: "good" as const,
      message: `Well-balanced for a ${profile} profile. No rebalancing needed right now.`,
    };
  }
  if (score >= 5) {
    return {
      tone: "warn" as const,
      message: `Slightly off-target for ${profile}. Target: ~${target.equity}% equity, ~${target.debt}% debt.`,
    };
  }
  return {
    tone: "bad" as const,
    message: `Significant drift from ${profile} targets. Rebalance toward ${target.equity}% equity, ${target.debt}% debt.`,
  };
}

export function PortfolioScorecard() {
  const [profile, setProfile] = useState<ProfileName>("Conservative");
  const [equity, setEquity] = useState(40);
  const [debt, setDebt] = useState(45);

  const remainder = Math.max(0, 100 - equity - debt);
  const score = balanceScore(equity, debt, profile);
  const advice = adviceFor(score, profile);

  /** Picking a profile moves the sliders to its target, as the spec does. */
  function selectProfile(next: ProfileName) {
    setProfile(next);
    setEquity(PROFILES[next].equity);
    setDebt(PROFILES[next].debt);
  }

  return (
    <ToolCard
      module="Asset Allocation & Portfolio Construction"
      name="Portfolio Balance Scorecard"
      description="Enter your asset mix. Get a live balance score and rebalancing cue for your risk profile."
    >
      <ToolPanel title="Portfolio Scorecard">
        <ToolChips
          label="Risk profile"
          options={PROFILE_NAMES}
          selected={profile}
          onSelect={selectProfile}
        />
        <ToolSlider
          label="Equity %"
          value={equity}
          display={`${equity}%`}
          min={0}
          max={100}
          step={5}
          onChange={setEquity}
        />
        <ToolSlider
          label="Debt %"
          value={debt}
          display={`${debt}%`}
          min={0}
          max={100}
          step={5}
          onChange={setDebt}
        />

        <ResultGrid columns={2}>
          <ResultBox
            label="Balance score"
            value={`${score.toFixed(1)}/10`}
            tone={score >= 8 ? "good" : score >= 5 ? "warn" : "bad"}
          />
          <ResultBox label="Gold + Cash" value={`${remainder}%`} />
        </ResultGrid>

        <ToolFlag tone={advice.tone}>{advice.message}</ToolFlag>
      </ToolPanel>
    </ToolCard>
  );
}
