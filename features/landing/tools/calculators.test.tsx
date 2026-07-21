import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DebtComparator } from "./DebtComparator";
import { PortfolioScorecard } from "./PortfolioScorecard";
import { RetirementCorpus } from "./RetirementCorpus";
import { SipGrowth } from "./SipGrowth";
import { ValuationCheck } from "./ValuationCheck";

/**
 * Calculators 2–6, checked at a known input so a formula change cannot pass
 * silently.
 *
 * Sliders are driven with a change event rather than arrow keys: jsdom does not
 * implement keyboard interaction for `input[type=range]`, so a keyboard test
 * here would assert jsdom's behaviour, not the product's. Real keyboard
 * operability is verified in the browser.
 */

/** Moves a slider the way a user would, by role rather than by label — the
 *  <label> also wraps a live <output>, which makes getByLabelText ambiguous. */
function setSlider(name: RegExp, value: number) {
  fireEvent.change(screen.getByRole("slider", { name }), { target: { value: String(value) } });
}

/** Reads a result box by its label, whatever markup surrounds it. */
function resultFor(label: string): string {
  const box = screen.getByText(label).parentElement;
  return box?.lastElementChild?.textContent ?? "";
}

describe("RetirementCorpus", () => {
  it("shows years to retirement from the age slider", () => {
    render(<RetirementCorpus />);
    expect(screen.getByText(/28 years to retirement/)).toBeInTheDocument();
  });

  it("recomputes when age changes", () => {
    render(<RetirementCorpus />);
    setSlider(/Current age/, 45);
    expect(screen.getByText(/15 years to retirement/)).toBeInTheDocument();
  });
});

describe("ValuationCheck", () => {
  it("rates the default 450/22 as fair, in line with the market", () => {
    render(<ValuationCheck />);
    expect(resultFor("P/E Ratio")).toBe("20.5×");
    expect(resultFor("Verdict")).toBe("Fair");
    expect(screen.getByText(/is in line with market/)).toBeInTheDocument();
  });

  it("keeps the market benchmark fixed at 22×", () => {
    render(<ValuationCheck />);
    expect(resultFor("Market avg")).toBe("22×");
  });
});

describe("DebtComparator", () => {
  it("puts the debt fund ahead of the FD at the default amount and tenure", () => {
    render(<DebtComparator />);
    // ₹1L over 3 years: 7.7% beats 6.9%, both taxed at the same slab.
    expect(resultFor("FD (post-tax)")).toBe("₹1.2L");
    expect(resultFor("Debt Fund")).toBe("₹1.2L");
    expect(screen.getByText(/Assumes 30% tax slab/)).toBeInTheDocument();
  });

  it("pluralises the tenure label", () => {
    render(<DebtComparator />);
    expect(screen.getByText("3 yrs")).toBeInTheDocument();
    setSlider(/Tenure/, 1);
    expect(screen.getByText("1 yr")).toBeInTheDocument();
  });
});

describe("PortfolioScorecard", () => {
  it("scores the default 40/45 mix against the conservative target", () => {
    render(<PortfolioScorecard />);
    // Drift of 10 (equity) + 10 (debt) = 20 → 10 - 20/5 = 6.0
    expect(resultFor("Balance score")).toBe("6.0/10");
    expect(resultFor("Gold + Cash")).toBe("15%");
    expect(screen.getByText(/Slightly off-target for Conservative/)).toBeInTheDocument();
  });

  it("moves the sliders to the target when a profile is chosen", async () => {
    render(<PortfolioScorecard />);
    await userEvent.click(screen.getByRole("button", { name: "Aggressive" }));
    expect(screen.getByRole("slider", { name: /Equity/ })).toHaveValue("75");
    expect(screen.getByRole("slider", { name: /Debt/ })).toHaveValue("18");
    // On target, so the score is perfect and the advice flips to positive.
    expect(resultFor("Balance score")).toBe("10.0/10");
    expect(screen.getByText(/No rebalancing needed/)).toBeInTheDocument();
  });

  it("marks the selected profile for assistive technology", async () => {
    render(<PortfolioScorecard />);
    const group = screen.getByRole("group", { name: "Risk profile" });
    expect(within(group).getByRole("button", { name: "Conservative" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(group).getByRole("button", { name: "Moderate" }));
    expect(within(group).getByRole("button", { name: "Conservative" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("SipGrowth", () => {
  it("splits the corpus into what was invested and what was earned", () => {
    render(<SipGrowth />);
    // ₹10K × 180 months = ₹18L invested.
    expect(resultFor("Invested")).toBe("₹18.0L");
    expect(resultFor("Corpus")).toBe("₹50.5L");
    expect(resultFor("Gains")).toBe("₹32.5L");
  });

  it("draws one bar per step, capped at ten", () => {
    const { container } = render(<SipGrowth />);
    const bars = container.querySelectorAll("[title^='₹']");
    expect(bars).toHaveLength(10);
  });
});
