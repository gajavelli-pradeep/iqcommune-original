import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Gallery } from "./sections/Gallery";
import { LandingSections } from "./LandingSections";

/**
 * Control contract — the gate the content-parity gate cannot be.
 *
 * Parity checks *text*. It stayed green while the header shipped a gold button
 * where the spec calls for ink, because the copy was identical and every token
 * used was real. A wrong variant is a valid class list.
 *
 * So this asserts the things the spec actually specifies per variant, at the
 * call sites that use them:
 *
 *   .btn-nav   background: var(--ink)   14px  padding 10px 22px  radius 100px
 *   .btn-gold  background: var(--gold)  16px  padding 16px 36px  radius 100px
 *              box-shadow: 0 6px 24px rgba(201,152,42,.35)  → --shadow-gold
 *
 * Classes are asserted rather than computed styles because jsdom applies no
 * stylesheet — `getComputedStyle` would report nothing for every one of them
 * and the test would pass on an empty page. Visual fidelity beyond this
 * (actual rendered colour) belongs to the browser pass.
 */

function requestButtons() {
  return screen.getAllByRole("button", { name: /Request a Session/ });
}

describe("Request a Session — control contract", () => {
  it("renders one per spec call site: header, hero, closing CTA", () => {
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    expect(requestButtons()).toHaveLength(3);
  });

  it("gives the header the ink variant, never gold", () => {
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    // The header's button is the first in document order.
    const header = requestButtons()[0];
    expect(header).toHaveClass("bg-ink");
    expect(header).not.toHaveClass("bg-gold");
    expect(header).toHaveClass("text-md");
  });

  it("gives the hero the ink primary variant, not gold", () => {
    // The spec uses .btn-primary here and .btn-gold only in the closing CTA.
    // Reusing gold for both was a real defect the fidelity audit caught.
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    const hero = requestButtons()[1];
    expect(hero).toHaveClass("bg-ink");
    expect(hero).not.toHaveClass("bg-gold");
  });

  it("gives the closing CTA the gold variant, with its glow", () => {
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    const cta = requestButtons()[2];
    expect(cta).toHaveClass("bg-gold");
    expect(cta).toHaveClass("shadow-gold");
    expect(cta).toHaveClass("text-xl");
  });

  it("keeps every variant a pill, as the spec's 100px radius requires", () => {
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    for (const button of requestButtons()) {
      expect(button).toHaveClass("rounded-full");
    }
  });

  it("keeps the V7 white label on a gold fill", () => {
    // Client exact-match directive: V7 .btn-gold uses a #fff label. This test
    // exists so the white label cannot be silently reverted to ink (the earlier
    // AA-driven treatment). White on ink is separately correct at 18:1.
    render(<LandingSections gallery={<Gallery photos={[]} />} />);
    for (const button of requestButtons().filter((b) => b.classList.contains("bg-gold"))) {
      expect(button).toHaveClass("text-surface");
      expect(button).not.toHaveClass("text-ink");
    }
  });
});
