import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared sticky site header — used by all eight public pages.
 *
 * `right` is a slot because each page puts something different there: the
 * landing page a "Request a Session" button, the practitioner page a link back
 * to the learner site, the flow pages a status pill. The chrome is identical
 * everywhere, so it lives here once.
 *
 * WIDTH BUDGET FOR `right` — measured, not estimated. At 320px the row is 288px
 * and the wordmark takes 114px, leaving **162px**. The spec's button at its
 * desktop sizing (14px text, 22px padding, trailing arrow) measures 183px and
 * overflows by 21px. Dropping the arrow and using 16px padding below 640px
 * gives 149px, which fits with 13px to spare. Anything placed here must stay
 * within 162px at 320px or the header scrolls sideways — a P1 bug.
 *
 * Rendered as <header> (role="banner") rather than the spec's <nav>. The
 * element holds a wordmark and one call-to-action — it is not a set of
 * navigation links, and announcing it as navigation misleads screen readers.
 */
export function SiteHeader({
  badge,
  badgeStyle = "lockup",
  right,
  width = "var(--container-page)",
}: {
  /**
   * Inner width. The public pages are 1100px, but each emailed page sets its
   * own so the wordmark lines up with the card beneath it — four different
   * values across the five, which one shared default silently flattened.
   */
  width?: string;
  /** One or two short lines identifying a sub-site, e.g. ["Practitioner", "Network"]. */
  badge?: readonly string[];
  /**
   * How the badge is drawn. The specs disagree deliberately: the emailed pages
   * render a gold pill (`.nav-badge`, radius 100px, 11px, 0.06em) while the
   * practitioner site uses an inline lockup separated by a rule. One component
   * serving both needs the variant, not a winner.
   */
  badgeStyle?: "pill" | "lockup";
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-surface/95 px-8 backdrop-blur-[12px]">
      <div
        style={{ maxWidth: width }}
        className="mx-auto flex h-[68px] items-center justify-between gap-3 sm:gap-4"
      >
        {/* Left cluster — logo and the lockup badge sit together, as V7 groups
            them inside one <a> (gap:14px). Spreading them with justify-between
            floated the lockup into the centre. */}
        <div className="flex min-w-0 items-center gap-[14px]">
          <Link
            href="/"
            className="flex shrink-0 flex-col gap-[3px]"
            aria-label="iqcommune — home"
          >
            <span className="flex items-baseline leading-none">
              <span className="text-4xl font-bold tracking-display text-gold sm:text-6xl">iq</span>
              <span className="text-4xl font-light tracking-display text-ink sm:text-6xl">
                commune
              </span>
            </span>
            {/* Shown from 360px up to match V7, which keeps the strapline on every
                phone. Hidden only below 360px, where the lockup plus the Request
                button overflows the viewport — the 320px P1 this guard exists for. */}
            <span className="hidden text-2xs font-medium uppercase leading-none tracking-caps text-ink-faint min-[360px]:block">
              Where financial intelligence connects
            </span>
          </Link>

          {badge && badgeStyle === "lockup" ? (
            <span className="hidden shrink-0 flex-col gap-0.5 border-l border-border-strong pl-3.5 sm:flex">
              {badge.map((line) => (
                <span
                  key={line}
                  className="text-2xs font-semibold uppercase leading-none tracking-caps text-gold-dark"
                >
                  {line}
                </span>
              ))}
            </span>
          ) : null}
        </div>

        {/* Right cluster — the pill badge (V7 places it top-right) and whatever
            call-to-action the page supplies. */}
        {(right || (badge && badgeStyle === "pill")) && (
          <div className="flex min-w-0 items-center gap-[0.6rem]">
            {/* Hidden below 640px: the wordmark, this badge and the right slot
                together overflow 320px. The page's own h1 also names the sub-site. */}
            {badge && badgeStyle === "pill" ? (
              <span className="hidden shrink-0 rounded-full border border-gold-border bg-gold-light px-2.5 py-[3px] text-xs font-semibold uppercase tracking-[0.06em] text-gold-dark sm:inline-flex">
                {badge.join(" ")}
              </span>
            ) : null}
            {right}
          </div>
        )}
      </div>
    </header>
  );
}
