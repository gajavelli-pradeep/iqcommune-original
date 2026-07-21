import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrainingTopics } from "./TrainingTopics";

const MODULE_NAMES = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
];

describe("TrainingTopics", () => {
  it("renders all six modules, in spec order", () => {
    render(<TrainingTopics />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(MODULE_NAMES);
  });

  it("gives every module a description", () => {
    render(<TrainingTopics />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.querySelector("p")?.textContent?.length ?? 0).toBeGreaterThan(60);
    }
  });

  it("carries the section copy verbatim", () => {
    render(<TrainingTopics />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("What you'll learn.");
    expect(
      screen.getByText(
        "Six focused modules — each led by a practitioner actively working in that specific area.",
      ),
    ).toBeInTheDocument();
  });

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<TrainingTopics />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
