import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhoIsThisFor } from "./WhoIsThisFor";

describe("WhoIsThisFor", () => {
  it("renders all three audiences", () => {
    render(<WhoIsThisFor />);
    for (const name of [
      "Groups",
      "Organisations & Institutions",
      "AMCs & Wealth Firms",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("keeps every sub-segment tag — 13 across the three cards", () => {
    render(<WhoIsThisFor />);
    const cards = screen.getAllByRole("listitem").filter((li) => li.querySelector("h3"));
    const tagCounts = cards.map(
      (card) => within(card).getAllByRole("listitem").length,
    );
    expect(tagCounts).toEqual([5, 4, 4]);
  });

  it("carries the participant cap note verbatim", () => {
    render(<WhoIsThisFor />);
    expect(
      screen.getByText(
        /All sessions capped at 25 participants — to keep the quality of conversation and interaction high\./,
      ),
    ).toBeInTheDocument();
  });

  it("explains the SPOC role on the Groups card", () => {
    render(<WhoIsThisFor />);
    expect(
      screen.getByText(/Register as the SPOC \(primary contact\) on behalf of your group/),
    ).toBeInTheDocument();
  });

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<WhoIsThisFor />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
