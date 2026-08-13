import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks", () => {
  it("lists the four steps in order", () => {
    render(<HowItWorks />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Pick a topic",
      "Join the waitlist",
      "We map your city",
      "Attend Session",
    ]);
  });

  it("promises no schedule while the waitlist phase is on", () => {
    const { container } = render(<HowItWorks />);
    // The section survived the client's messaging change by being reworded
    // rather than hidden. Any of these reappearing means it drifted back to
    // promising a date the empanelment phase cannot keep.
    expect(container.textContent).not.toMatch(
      /schedule around you|lock in the schedule|preferred date window/i,
    );
  });

  it("numbers the steps 1 to 4", () => {
    render(<HowItWorks />);
    for (const n of ["1", "2", "3", "4"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it("uses an ordered list, since the steps are sequential", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("keeps the participant cap and the in-person promise in step four", () => {
    render(<HowItWorks />);
    expect(
      screen.getByText(
        /In-person, focused session — max 25 people — led by a practitioner still active in that field\./,
      ),
    ).toBeInTheDocument();
  });
});
