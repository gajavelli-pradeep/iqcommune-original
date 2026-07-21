import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AudienceRibbon, TrustBar } from "./TrustStrips";

describe("TrustBar", () => {
  it("renders all three trust claims as a list", () => {
    render(<TrustBar />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getByText("All practitioners currently active in that specific domain"),
    ).toBeInTheDocument();
    expect(screen.getByText("In-person sessions only — not online")).toBeInTheDocument();
    expect(screen.getByText("Max 25 participants per session")).toBeInTheDocument();
  });

  it("hides its decorative icons from assistive technology", () => {
    const { container } = render(<TrustBar />);
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(3);
    for (const icon of icons) expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

describe("AudienceRibbon", () => {
  it("renders the three audience types", () => {
    render(<AudienceRibbon />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Organisations & Institutions")).toBeInTheDocument();
    expect(screen.getByText("AMCs & Wealth Management Firms")).toBeInTheDocument();
  });

  it("uses gold-dark for its label text, the AA-safe gold on a light fill", () => {
    render(<AudienceRibbon />);
    expect(screen.getByText("Groups")).toHaveClass("text-gold-dark");
  });
});
