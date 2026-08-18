"use client";

import { forwardRef, type ReactNode, type UIEvent } from "react";

/**
 * A keyboard-reachable scroll container, shared by the two places the app
 * constrains height/width: the agreement read-gate (vertical, `onReachEnd`
 * flips the read-to-end flag) and the console table (horizontal, a ten-column
 * table can't reflow to 320px without losing columns).
 *
 * `role="region"` + `tabIndex={0}` + `aria-label` make the overflow reachable
 * and scrollable by keyboard alone (audit A11Y-3).
 *
 * Overscroll containment is applied PER AXIS, and that is load-bearing. Setting
 * `overscroll-behavior: contain` on a horizontal scroller looks harmless but
 * breaks the page: declaring `overflow-x: auto` makes the browser compute
 * `overflow-y: auto` as well, so the region counts as a vertical scroll
 * container that is already at its boundary — and containment then SWALLOWS
 * every vertical wheel event instead of letting it chain to the document. On a
 * tall console tab the table covers most of the viewport, so the page simply
 * would not scroll. Contain the axis this region owns; let the other chain.
 *
 * `relative` is load-bearing, not decoration. `overflow` only clips descendants
 * whose containing block is inside the scroller; an absolutely positioned one
 * with no positioned ancestor resolves against the initial containing block and
 * escapes the clip entirely. Tailwind's `sr-only` is `position: absolute`, so a
 * single visually-hidden label inside a wide table — the accessible name on a
 * cell's `<select>`, say — sat at x≈900 and dragged the whole PAGE into
 * horizontal scroll at 320px, while the table itself scrolled correctly. Making
 * this a containing block is what keeps that contained.
 */

// A flick rarely lands on the exact last pixel, and sub-pixel rounding means
// `>= scrollHeight` never fires — treat within 24px of the end as "reached".
const END_THRESHOLD = 24;

export const ScrollRegion = forwardRef<
  HTMLDivElement,
  {
    ariaLabel: string;
    axis?: "x" | "y";
    /** Fires (possibly repeatedly) once scrolled within 24px of the end. */
    onReachEnd?: () => void;
    className?: string;
    children: ReactNode;
  }
>(function ScrollRegion({ ariaLabel, axis = "y", onReachEnd, className, children }, ref) {
  const handleScroll = onReachEnd
    ? (event: UIEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        const reached =
          axis === "y"
            ? el.scrollTop + el.clientHeight >= el.scrollHeight - END_THRESHOLD
            : el.scrollLeft + el.clientWidth >= el.scrollWidth - END_THRESHOLD;
        if (reached) onReachEnd();
      }
    : undefined;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      className={`${
        axis === "y"
          ? "overflow-y-auto overscroll-y-contain"
          : // `overscroll-y-auto` is set explicitly, not left at its default
            // (client, 2026-08-18): the browser-computed `overflow-y: auto`
            // this file's own header warns about (declaring `overflow-x`
            // makes the UA compute `overflow-y` too) leaves this region a
            // vertical scroll container in its own right, and an implicit
            // `overscroll-behavior-y` has chained inconsistently across
            // browsers on exactly that shape — a wheel scroll over the table
            // staying trapped in its own (empty) vertical scroll room instead
            // of reaching the page underneath it. Stating `auto` outright is
            // what actually guarantees the chain.
            "overflow-x-auto overscroll-x-contain overscroll-y-auto"
      } relative rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
});
