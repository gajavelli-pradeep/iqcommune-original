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
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-100 border-b border-border bg-surface/95 px-4 backdrop-blur-[12px] sm:px-8">
      <div className="mx-auto flex h-[68px] max-w-page items-center justify-between gap-3 sm:gap-4">
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
          {/* Hidden below 640px. The spec has no mobile rules for the header, and
              at 320px the lockup plus the Request button overflows the viewport —
              a P1 bug. The strapline is decoration inside the wordmark, not an
              affordance or information the reader needs, so it is the right thing
              to drop; a header that scrolls sideways is not a fair trade for it.
              Allowlisted in the content-parity gate for exactly this reason. */}
          <span className="hidden text-2xs font-medium uppercase leading-none tracking-caps text-ink-faint sm:block">
            Where financial intelligence connects
          </span>
        </Link>

        {right && (
          <div className="flex min-w-0 items-center gap-[0.6rem]">{right}</div>
        )}
      </div>
    </header>
  );
}
