import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CtaSection } from "./CtaSection";

describe("CtaSection", () => {
  it("renders the headline and its supporting line", () => {
    render(<CtaSection />);
    expect(
      screen.getByRole("heading", {
        name: "If you are serious to improve your financial literacy",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tell us your topic, your group/)).toBeInTheDocument();
  });

  it("lists all three reassurances", () => {
    render(<CtaSection />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("No fixed slots — we schedule around you")).toBeInTheDocument();
    expect(screen.getByText("Max 25 participants per session")).toBeInTheDocument();
    expect(screen.getByText("We'll reach out within 2–3 working days")).toBeInTheDocument();
  });

  it("ships no inert call-to-action button", () => {
    // The spec's button opens RequestModal. Until that exists, rendering it
    // would put a dead control on the page — a P1 defect, not a placeholder.
    render(<CtaSection />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
