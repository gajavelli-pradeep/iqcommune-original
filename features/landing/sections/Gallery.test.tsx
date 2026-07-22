import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Gallery } from "./Gallery";

// Gallery renders a self-contained carousel (GalleryCarousel) — no dialog context.
const withProvider = (ui: React.ReactNode) => render(ui);

/**
 * The gallery distinguishes an outage from an empty database on purpose: a
 * failed read must state the problem, never render as "no photos" and hide an
 * outage behind a plausible page. The Suspense fallback also renders this same
 * component in its `photos=[] failed=false` placeholder state.
 */
describe("Gallery", () => {
  it("announces an outage as an alert when the read failed", () => {
    withProvider(<Gallery photos={[]} failed />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/couldn.t load the session photos/i);
  });

  it("shows illustrative placeholders (not an error) when the DB is empty", () => {
    withProvider(<Gallery photos={[]} failed={false} />);
    expect(screen.queryByRole("alert")).toBeNull();
    // A designed empty state, not an outage.
    expect(screen.getByText("Deep in a foundations session")).toBeInTheDocument();
  });

  it("renders published photos with their captions and alt text", () => {
    withProvider(
      <Gallery
        photos={[{ id: "1", url: "/x.jpg", caption: "A live session", city: "Pune" }]}
        failed={false}
      />,
    );
    expect(screen.getByAltText("A live session")).toBeInTheDocument();
    expect(screen.getByText("Pune")).toBeInTheDocument();
  });
});
