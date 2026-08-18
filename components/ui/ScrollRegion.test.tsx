import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScrollRegion } from "./ScrollRegion";

/**
 * The vertical page must keep scrolling past a horizontally-scrolling table
 * (client, 2026-08-18) — pinned here because it is a one-line regression: an
 * axis="x" region without an explicit `overscroll-y-auto` has, on this exact
 * shape, trapped a vertical wheel scroll instead of letting it reach the page.
 */

describe("ScrollRegion", () => {
  it("contains only its own axis, explicitly letting the other one chain (axis=x)", () => {
    render(
      <ScrollRegion ariaLabel="A table" axis="x">
        content
      </ScrollRegion>,
    );
    const region = screen.getByRole("region", { name: "A table" });
    expect(region.className).toContain("overscroll-x-contain");
    expect(region.className).toContain("overscroll-y-auto");
  });

  it("contains only its own axis, explicitly letting the other one chain (axis=y)", () => {
    render(
      <ScrollRegion ariaLabel="A list" axis="y">
        content
      </ScrollRegion>,
    );
    const region = screen.getByRole("region", { name: "A list" });
    expect(region.className).toContain("overscroll-y-contain");
    expect(region.className).not.toContain("overscroll-x-contain");
  });
});
