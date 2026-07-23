import { render, screen, within } from "@testing-library/react";
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

  it("renders all twenty placeholder slides", () => {
    withProvider(<Gallery photos={[]} />);
    expect(screen.getAllByRole("button", { name: /^Go to photo/ })).toHaveLength(20);
  });

  it("tops up a partly-filled gallery with artwork, keeping twenty slides", () => {
    withProvider(
      <Gallery photos={[{ id: "1", url: "/x.jpg", caption: "A live session", city: "Pune" }]} />,
    );
    expect(screen.getAllByRole("button", { name: /^Go to photo/ })).toHaveLength(20);
    // The real photo leads; the artwork picks up from slide two.
    expect(screen.getByAltText("A live session")).toBeInTheDocument();
    expect(screen.getByAltText("Full house for equity investing")).toBeInTheDocument();
    expect(screen.queryByAltText("Deep in a foundations session")).toBeNull();
  });

  it("captions a published photo on the slide itself, since its pixels carry none", () => {
    withProvider(
      <Gallery photos={[{ id: "1", url: "/x.jpg", caption: "A live session", city: "Pune" }]} />,
    );
    // Scoped to its own slide: an artwork slide further along is also Pune.
    const slide = screen.getByAltText("A live session").closest("li")!;
    expect(within(slide).getByText("A live session")).toBeInTheDocument();
    expect(within(slide).getByText("Pune")).toBeInTheDocument();
  });
});
