import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("points the practitioner call-to-action at /practitioners", () => {
    render(<SiteFooter />);
    expect(
      screen.getByRole("link", {
        name: /Teach what you practise — join the iqcommune practitioner network/,
      }),
    ).toHaveAttribute("href", "/practitioners");
  });

  it("exposes the contact address as a mailto link", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "hello@iqcommune.com" })).toHaveAttribute(
      "href",
      "mailto:hello@iqcommune.com",
    );
  });

  it("carries the spec copy verbatim", () => {
    render(<SiteFooter />);
    expect(screen.getByText("Are you a finance professional?")).toBeInTheDocument();
    expect(
      screen.getByText(/Insight Quotient - Unleashed\./),
    ).toBeInTheDocument();
  });

  it("keeps the space before the em dash", () => {
    // Regression: written as loose JSX text, `</strong> — Insight` renders as
    // "iqcommune— Insight". Invisible in a screenshot, caught by measurement.
    const { container } = render(<SiteFooter />);
    const tagline = [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("Insight Quotient"),
    );
    expect(tagline?.textContent).toMatch(/iqcommune — Insight Quotient - Unleashed\./);
  });

  it("renders the current year, so the footer never looks abandoned", () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} iqcommune. All rights reserved.`),
    ).toBeInTheDocument();
  });
});
