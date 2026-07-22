"use client";

import { forwardRef, type ReactNode, type UIEvent } from "react";

/**
 * A keyboard-reachable scroll container, shared by the two places the app
 * constrains height/width: the agreement read-gate (vertical, `onReachEnd`
 * flips the read-to-end flag) and the console table (horizontal, a ten-column
 * table can't reflow to 320px without losing columns).
 *
 * `role="region"` + `tabIndex={0}` + `aria-label` make the overflow reachable
 * and scrollable by keyboard alone (audit A11Y-3). `overscroll-contain` stops a
 * flick at the end from scrolling the page behind it.
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
        axis === "y" ? "overflow-y-auto" : "overflow-x-auto"
      } overscroll-contain rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
});
