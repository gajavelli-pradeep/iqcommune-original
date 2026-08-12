import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("is announced as the site banner, not as navigation", () => {
    // The spec markup is <nav>, but the element holds a wordmark and one CTA —
    // no navigation links. role="navigation" would mislead screen readers.
    render(<SiteHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("gives the split wordmark a single accessible name", () => {
    // "iq" and "commune" are separate spans so they can carry different weight
    // and colour; without the label a screen reader announces them apart.
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "iqcommune — home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("carries the strapline in the markup so it is never lost on mobile", () => {
    // Hidden below 640px via CSS, present in the DOM at every width — the
    // parity gate must still find it.
    render(<SiteHeader />);
    expect(
      screen.getByText("Insight Quotient - Unleashed"),
    ).toBeInTheDocument();
  });

  it("renders the right slot when a page supplies one", () => {
    render(<SiteHeader right={<button type="button">Join the Waitlist</button>} />);
    expect(
      screen.getByRole("button", { name: "Join the Waitlist" }),
    ).toBeInTheDocument();
  });

  it("omits the right container entirely when no slot is supplied", () => {
    // An empty flex div is dead markup; the landing page has no button until
    // RequestModal exists.
    const { container } = render(<SiteHeader />);
    expect(container.querySelectorAll("header > div > *")).toHaveLength(1);
  });
});
