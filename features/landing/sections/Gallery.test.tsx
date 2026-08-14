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

  it("renders two photos sharing a caption, rather than collapsing them", () => {
    // The slide key was the caption, so a second photo captioned the same as
    // the first collided with it: React warned about duplicate keys and
    // dropped or duplicated a slide. Captions are free text an admin types —
    // "GD" twice is not a misuse, and two "Session in Pune" never would be.
    withProvider(
      <Gallery
        photos={[
          { id: "1", url: "/a.jpg", caption: "GD", city: "Pune" },
          { id: "2", url: "/b.jpg", caption: "GD", city: "Mumbai" },
        ]}
      />,
    );

    const shared = screen.getAllByAltText("GD");
    expect(shared).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Go to photo/ })).toHaveLength(20);

    // Scoped to their own slides — an artwork slide further along is also Pune.
    // Distinct cities prove the two did not collapse into one another.
    const [first, second] = shared.map((image) => image.closest("li")!);
    expect(within(first).getByText("Pune")).toBeInTheDocument();
    expect(within(second).getByText("Mumbai")).toBeInTheDocument();
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
