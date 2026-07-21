import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrainerComparison } from "./TrainerComparison";

describe("TrainerComparison", () => {
  it("keeps both sides of the comparison in the document", () => {
    // Parity guard. The spec hides .diff-col.them below 720px, which deletes
    // half the argument on a phone. Both columns must always be present.
    render(<TrainerComparison />);
    expect(
      screen.getByRole("heading", { name: "Conventional Trainers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Our Practitioners" })).toBeInTheDocument();
  });

  it("lists all five points on each side", () => {
    render(<TrainerComparison />);
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    for (const list of lists) {
      expect(list.querySelectorAll("li")).toHaveLength(5);
    }
  });

  it("carries the comparison copy verbatim", () => {
    render(<TrainerComparison />);
    expect(screen.getByText("Focus on theory & concepts")).toBeInTheDocument();
    expect(
      screen.getByText("You step out with a clear plan of action with real numbers"),
    ).toBeInTheDocument();
  });

  it("puts the trainers column before the practitioners column", () => {
    // Stacked on mobile, the contrast only reads in this order.
    render(<TrainerComparison />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Conventional Trainers",
      "Our Practitioners",
    ]);
  });

  it("uses semantic lists rather than stacked divs", () => {
    render(<TrainerComparison />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
});
