import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("carries the headline as the page's only h1", () => {
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(
      "Real financial insights from active professionals — backed by years of experience.",
    );
  });

  it("emphasises 'active' without italicising it", () => {
    // The spec uses <em> for the gold word but resets font-style: it is colour
    // emphasis, not tone-of-voice emphasis.
    render(<Hero />);
    const em = screen.getByRole("heading", { level: 1 }).querySelector("em");
    expect(em).toHaveTextContent("active");
    expect(em).toHaveClass("not-italic");
  });

  it("carries the badge, sub and scheduling note verbatim", () => {
    render(<Hero />);
    expect(screen.getByText("Taught by Active Professionals")).toBeInTheDocument();
    expect(
      screen.getByText("Built for anyone serious about financial literacy."),
    ).toBeInTheDocument();
    expect(screen.getByText("We'll schedule around you")).toBeInTheDocument();
  });

  it("renders all three pool figures and all four practitioner roles", () => {
    render(<Hero />);
    for (const figure of ["12+", "20+", "6"]) {
      expect(screen.getByText(figure)).toBeInTheDocument();
    }
    for (const role of [
      "Equity Analysts",
      "Portfolio Managers",
      "Certified Financial Planners",
      "Wealth Managers",
    ]) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }
  });

  it("hides decorative icons and the glow from assistive tech", () => {
    // The glow is paint, and every icon sits beside text that already carries
    // the meaning. Announcing either is noise for a screen reader.
    const { container } = render(<Hero />);
    const svgs = [...container.querySelectorAll("svg")];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("keeps the qualifying note with the pool card", () => {
    render(<Hero />);
    const note = screen.getByText(/Every session is led by a practitioner/);
    expect(within(note).queryByRole("img")).toBeNull();
    expect(note).toHaveTextContent(
      "Every session is led by a practitioner currently active in that specific area of finance.",
    );
  });
});
