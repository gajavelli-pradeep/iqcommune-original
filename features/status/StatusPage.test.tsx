import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPage } from "./StatusPage";
import type { ApplicationStatus } from "@/types/link-pages";

const BASE: ApplicationStatus = {
  firstName: "Ananya",
  headline: "You're empanelled!",
  detail: "Welcome to the iqcommune practitioner network.",
  appliedOn: "12 Jul 2026",
  pipelineStep: 3,
  modules: "Equity Investing Simplified, Debt & Fixed Income Investing",
  cityState: "Mumbai, Maharashtra",
  experience: "9 – 12 years",
};

describe("StatusPage", () => {
  it("shows the applicant's status when the token verified", () => {
    render(<StatusPage status={BASE} />);

    expect(screen.getByText("You're empanelled!")).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the iqcommune practitioner network\./)).toBeInTheDocument();
    // One <p> with a <br/> between the two lines — an element match, not a
    // node match, so a regex substring is what finds it, not an exact string.
    expect(screen.getByText(/Hi Ananya/)).toBeInTheDocument();
    expect(screen.getByText(/Applied on 12 Jul 2026/)).toBeInTheDocument();
  });

  it("shows what was applied with — modules, city and experience", () => {
    render(<StatusPage status={BASE} />);

    expect(screen.getByText("Equity Investing Simplified, Debt & Fixed Income Investing")).toBeInTheDocument();
    expect(screen.getByText("Mumbai, Maharashtra")).toBeInTheDocument();
    expect(screen.getByText("9 – 12 years")).toBeInTheDocument();
  });

  it("shows the pipeline stepper with the terminal step marked done, not active", () => {
    render(<StatusPage status={BASE} />);

    expect(screen.getByText("Pipeline progress")).toBeInTheDocument();
    expect(screen.getByText("Empanelled")).toBeInTheDocument();
    // Terminal step reached: all four steps read as done (✓), none "active".
    expect(screen.getAllByText("✓")).toHaveLength(4);
  });

  it("accents the card green once the terminal step is reached, gold otherwise", () => {
    const { container: done } = render(<StatusPage status={BASE} />);
    expect(done.querySelector("section")).toHaveClass("border-t-green");

    const { container: inProgress } = render(<StatusPage status={{ ...BASE, pipelineStep: 1 }} />);
    expect(inProgress.querySelector("section")).toHaveClass("border-t-gold");
  });

  it("shows the stepper mid-pipeline with only the reached steps marked done", () => {
    render(
      <StatusPage
        status={{
          ...BASE,
          firstName: "Vikram",
          headline: "Screening complete",
          detail: "We're preparing your agreement.",
          appliedOn: "1 Jul 2026",
          pipelineStep: 1,
        }}
      />,
    );

    expect(screen.getAllByText("✓")).toHaveLength(1);
  });

  it("hides the stepper when the status has no pipeline step (e.g. Rejected)", () => {
    render(
      <StatusPage
        status={{
          ...BASE,
          firstName: "Rahul",
          headline: "Application update",
          detail: "We won't be moving forward this time.",
          appliedOn: "1 Jul 2026",
          pipelineStep: null,
        }}
      />,
    );

    expect(screen.queryByText("Pipeline progress")).not.toBeInTheDocument();
  });

  it("shows the shared invalid-link state when the token did not verify", () => {
    render(<StatusPage failure="expired" />);

    expect(screen.getByText("This link has expired")).toBeInTheDocument();
  });

  it("falls back to the invalid-link state if neither prop is given", () => {
    render(<StatusPage />);

    expect(screen.getByText("This link isn't complete")).toBeInTheDocument();
  });
});
