import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BundledSessions } from "./BundledSessions";

describe("BundledSessions", () => {
  it("offers three pairings, each of two modules", () => {
    render(<BundledSessions />);
    const orderedLists = screen.getAllByRole("list").filter((l) => l.tagName === "OL");
    expect(orderedLists).toHaveLength(3);
    for (const list of orderedLists) {
      expect(list.querySelectorAll("li")).toHaveLength(2);
    }
  });

  it("shows the total and per-module durations", () => {
    render(<BundledSessions />);
    expect(screen.getAllByText("6 hrs total")).toHaveLength(3);
    expect(screen.getAllByText("3 hrs")).toHaveLength(6);
  });

  it("numbers the modules 01 and 02 within each pairing", () => {
    render(<BundledSessions />);
    expect(screen.getAllByText("01")).toHaveLength(3);
    expect(screen.getAllByText("02")).toHaveLength(3);
  });

  it("states the raised minimum for bundled group bookings", () => {
    // 9 rather than the usual 5 — a commercial term, not decoration.
    render(<BundledSessions />);
    expect(
      screen.getByText(
        /Groups booking a bundle need a minimum of 9 participants, instead of the usual 5/,
      ),
    ).toBeInTheDocument();
  });

  it("uses an ordered list, since the modules are taught in sequence", () => {
    const { container } = render(<BundledSessions />);
    expect(container.querySelectorAll("ol")).toHaveLength(3);
  });
});
