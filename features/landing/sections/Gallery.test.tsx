import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Gallery } from "./Gallery";

// Gallery renders a self-contained carousel (GalleryCarousel) — no dialog context.
const withProvider = (ui: React.ReactNode) => render(ui);

/**
 * No photo has ever been published, so an empty read and a broken one show the
 * same thing: the illustrative artwork. The section never alarms a visitor —
 * a failed read is reported to the server log by GallerySection instead. The
 * Suspense fallback renders this same component in its `photos=[]` state.
 */
describe("Gallery", () => {
  it("shows illustrative placeholders, never an alarm, when the DB is empty", () => {
    withProvider(<Gallery photos={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    // The caption reaches the reader as the artwork's alt text, since the
    // artwork prints the caption itself.
    expect(screen.getByAltText("Deep in a foundations session")).toBeInTheDocument();
  });

  it("renders published photos with their captions and alt text", () => {
    withProvider(
      <Gallery photos={[{ id: "1", url: "/x.jpg", caption: "A live session", city: "Pune" }]} />,
    );
    expect(screen.getByAltText("A live session")).toBeInTheDocument();
    expect(screen.getByText("Pune")).toBeInTheDocument();
  });
});
