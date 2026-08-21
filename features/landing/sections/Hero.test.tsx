import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequestSessionProvider } from "../RequestSession";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("carries the headline as the page's only h1", () => {
    render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(
      "Real financial insights from active professionals — backed by years of experience.",
    );
  });

  it("emphasises 'active' without italicising it", () => {
    // The spec uses <em> for the gold word but resets font-style: it is colour
    // emphasis, not tone-of-voice emphasis.
    render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    const em = screen.getByRole("heading", { level: 1 }).querySelector("em");
    expect(em).toHaveTextContent("active");
    expect(em).toHaveClass("not-italic");
  });

  it("carries the badge, sub and scheduling note verbatim", () => {
    render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    expect(screen.getByText("Taught by Active Professionals")).toBeInTheDocument();
    expect(
      screen.getByText("Built for anyone serious about financial literacy."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We'll notify you when we launch in your city"),
    ).toBeInTheDocument();
  });

  it("renders all three pool figures and all six practitioner roles", () => {
    render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    for (const figure of ["8+", "12+", "3"]) {
      expect(screen.getByText(figure)).toBeInTheDocument();
    }
    for (const role of [
      "Equity Analysts",
      "Portfolio Managers",
      "Certified Financial Planners",
      "Wealth Advisors & RMs",
      "Fund & Product Specialists / MFDS",
      "Corporate Finance Professionals",
    ]) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }
  });

  it("hides decorative icons and the glow from assistive tech", () => {
    // The glow is paint, and every icon sits beside text that already carries
    // the meaning. Announcing either is noise for a screen reader.
    const { container } = render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    const svgs = [...container.querySelectorAll("svg")];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("drops the qualifying note the 2026-08-12 delivery removed", () => {
    // The pool card used to close with "Every session is led by a practitioner
    // currently active…". The client removed it along with the waitlist copy,
    // and the card now ends on the role grid. Asserted rather than deleted:
    // the sentence reads like an obvious improvement to re-add, and doing so
    // would silently re-fail the parity gate.
    render(
      <RequestSessionProvider>
        <Hero />
      </RequestSessionProvider>,
    );
    expect(screen.queryByText(/Every session is led by a practitioner/)).toBeNull();
  });
});
