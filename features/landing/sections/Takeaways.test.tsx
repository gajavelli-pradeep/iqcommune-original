import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Takeaways } from "./Takeaways";

describe("Takeaways", () => {
  it("renders six cards of four deliverables each", () => {
    render(<Takeaways />);
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards).toHaveLength(6);
    // 6 outer cards + 24 deliverables
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
  });

  it("keeps the two shortened card titles the spec uses here", () => {
    // These deliberately differ from the module names in TrainingTopics —
    // "Financial Planning" and "Investment Solutions &" are dropped. Copying
    // the module names instead would be a silent rewrite of the client's copy.
    render(<Takeaways />);
    expect(
      screen.getByRole("heading", { name: "Retirement & Goal-Based Planning" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Portfolio & Investment Strategies" }),
    ).toBeInTheDocument();
  });

  it("carries the closing callout, with its emphasis intact", () => {
    render(<Takeaways />);
    const strong = screen.getByText("This isn't a certificate programme.");
    expect(strong.tagName).toBe("STRONG");
    expect(strong.parentElement).toHaveTextContent(
      /There are no slides to take home\. What you leave with is a working plan/,
    );
  });

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<Takeaways />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
