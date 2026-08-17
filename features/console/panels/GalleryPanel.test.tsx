import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GalleryPanel } from "./GalleryPanel";
import { GALLERY_FIELD_MAX } from "@/constants/gallery";
import type { GalleryRow } from "@/services/console";

/**
 * City and caption are short labels on a landing-page tile, capped at
 * GALLERY_FIELD_MAX (client, 2026-08-17). Enforced with a native `maxLength`
 * rather than a validation message, so this proves the attribute is on the
 * element the browser actually reads — nothing here can drive a real keystroke
 * past the limit and check that it was refused, since jsdom's `<input>` does not
 * enforce `maxLength` the way a real browser does.
 */

vi.mock("../actions", () => ({
  moveGalleryPhoto: vi.fn(),
  publishGalleryDrafts: vi.fn(),
  removeGalleryPhoto: vi.fn(),
  unpublishGalleryPhoto: vi.fn(),
  updateGalleryPhoto: vi.fn(),
}));

const draft = (overrides: Partial<GalleryRow> = {}): GalleryRow => ({
  id: "photo-1",
  url: "https://example.com/photo.jpg",
  caption: null,
  city: null,
  sortOrder: 0,
  status: "Draft",
  addedOn: "16 Aug 2026",
  ...overrides,
});

const show = (rows: GalleryRow[]) => render(<GalleryPanel rows={rows} role="global_admin" />);

describe("a draft photo's city and caption are capped", () => {
  it("stops the city input at the shared limit", () => {
    show([draft()]);
    expect(screen.getByLabelText("City")).toHaveAttribute("maxLength", String(GALLERY_FIELD_MAX));
  });

  it("stops the caption input at the same limit", () => {
    show([draft()]);
    expect(screen.getByLabelText("Caption")).toHaveAttribute(
      "maxLength",
      String(GALLERY_FIELD_MAX),
    );
  });

  it("says nothing while a caption is nowhere near the limit", () => {
    // A "0/50" on every tile in a grid of drafts is noise nobody asked to read.
    show([draft({ caption: "Group discussion" })]);
    expect(screen.queryByText(/\/50/)).not.toBeInTheDocument();
  });

  it("counts down once a caption is close to the limit", () => {
    show([draft({ caption: "x".repeat(GALLERY_FIELD_MAX - 10) })]);
    expect(screen.getByText(`${GALLERY_FIELD_MAX - 10}/${GALLERY_FIELD_MAX}`)).toBeInTheDocument();
  });

  it("marks the count differently once the caption is actually full", () => {
    show([draft({ caption: "x".repeat(GALLERY_FIELD_MAX) })]);
    const count = screen.getByText(`${GALLERY_FIELD_MAX}/${GALLERY_FIELD_MAX}`);
    expect(count.className).toContain("text-red");
  });
});
