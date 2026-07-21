import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ConsentForm } from "./ConsentForm";
import type { ConsentSession } from "./SessionSummary";

const SESSION: ConsentSession = {
  reference: "IQC-CONF-0026",
  agreementReference: "IQC-EMP-0042",
  issuedOn: "18 Jun 2025",
  firstName: "Vikram",
  module: "Equity Investing Simplified",
  date: "20 Jun 2025",
  startTime: "10:00 AM",
  duration: "3 hours",
  venue: "Society clubhouse",
  cityState: "Mumbai, Maharashtra",
  audience: "Group",
  participants: "18",
  spoc: "Rohan Mehta",
  grossPayout: "₹12,000",
};

describe("ConsentForm", () => {
  it("cannot record consent until the box is ticked", () => {
    render(<ConsentForm session={SESSION} />);
    expect(screen.getByRole("button", { name: "Provide consent" })).toBeDisabled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("states the payout as gross, and says the rest is handled elsewhere", () => {
    // The figure is the thing being consented to, so it must be unambiguous
    // about what it does and does not include.
    render(<ConsentForm session={SESSION} />);
    expect(screen.getByText("Gross payout amount")).toBeInTheDocument();
    expect(screen.getByText("₹12,000")).toBeInTheDocument();
    expect(screen.getByText(/TDS, GST, and net calculations are handled separately/)).toBeInTheDocument();
  });

  it("shows all three declarations before asking for consent", () => {
    render(<ConsentForm session={SESSION} />);
    expect(screen.getByText(/I have reviewed all session details/)).toBeInTheDocument();
    expect(screen.getByText(/I agree to deliver the session as described/)).toBeInTheDocument();
    expect(screen.getByText(/does not alter my empanelment agreement/)).toBeInTheDocument();
  });

  it("records consent with a timestamp", async () => {
    const user = userEvent.setup();
    render(<ConsentForm session={SESSION} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Provide consent" }));

    expect(screen.getByRole("heading", { name: "Consent recorded" })).toBeInTheDocument();
    expect(screen.getByText(/Digital consent timestamp:/)).toBeInTheDocument();
  });
});
