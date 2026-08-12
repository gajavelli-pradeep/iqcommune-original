import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared sticky site header — used by all eight public pages.
 *
 * `right` is a slot because each page puts something different there: the
 * landing page a "Join the Waitlist" button, the practitioner page a link back
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
  menu,
  width = "var(--container-page)",
  strapline = "Insight Quotient - Unleashed",
  compact = false,
  markSize,
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
  /**
   * Small-screen navigation. Rendered below `sm`, where `right` is often the
   * only control and a long page has no other way around itself. The emailed
   * flow pages pass nothing: they are one screen with one action.
   */
  menu?: ReactNode;
  /**
   * Wordmark sub-line. Defaults to the public strapline; the emailed flow pages
   * pass `null` — their V7 nav has no strapline at all.
   */
  strapline?: string | null;
  /**
   * 22px wordmark instead of the public 26px. The emailed flow-page navs
   * (`.nav-logo-mark` font-size:22px) are smaller than the marketing header.
   */
  compact?: boolean;
  /**
   * Logo edge in px, where a page's V7 nav sizes it off the default. The
   * delivery uses three: 38 on the marketing navs, 34 on the compact ones, and
   * 37 on onboarding and post-session photos, which sit between the two.
   */
  markSize?: number;
}) {
  const wordmark = compact ? "text-4xl" : "text-4xl sm:text-6xl";
  const mark = markSize ?? (compact ? 34 : 38);
  // V7 pairs the smaller marks with an 8px radius and the 38px one with 9px.
  const markRadius = mark < 37 ? "rounded-lg" : "rounded-[9px]";
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
          {/* V7 splits the lockup into two anchors — the wordmark to the page
              and the strapline to the live site — but both resolve to the same
              place from inside the app, and its strapline href is the
              `iqcommune.vercel.app` preview origin, which must not ship as an
              external link from production. One link to `/` renders identically
              and keeps a single accessible name for the whole lockup. */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="iqcommune — home"
          >
            {/* Decorative: the link already carries the name, so a second
                announcement of "iqcommune" here would be read twice. */}
            <Image
              src="/logo.png"
              alt=""
              width={mark}
              height={mark}
              priority
              className={`shrink-0 ${markRadius}`}
            />
            <span className="flex flex-col gap-[3px]">
              <span className="flex items-baseline leading-none">
                <span className={`${wordmark} font-bold tracking-display text-gold`}>iq</span>
                <span className={`${wordmark} font-light tracking-display text-ink`}>commune</span>
              </span>
              {/* Shown from 360px up to match V7, which keeps the strapline on
                  every phone. Hidden only below 360px, where the lockup plus the
                  waitlist button overflows the viewport — the 320px P1 this
                  guard exists for. */}
              {/* 9.5px, not the 10px `text-2xs` the badge lockup beside it uses:
                  V7 sizes the strapline half a pixel smaller on every page that
                  carries one, and at this length the difference is ~9px of width. */}
              {strapline ? (
                <span className="hidden text-[9.5px] font-medium uppercase leading-none tracking-caps text-ink-faint min-[360px]:block">
                  {strapline}
                </span>
              ) : null}
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
        {(right || menu || (badge && badgeStyle === "pill")) && (
          <div className="flex min-w-0 shrink-0 items-center gap-[0.6rem]">
            {/* Hidden below 640px: the wordmark, this badge and the right slot
                together overflow 320px. The page's own h1 also names the sub-site. */}
            {badge && badgeStyle === "pill" ? (
              <span className="hidden shrink-0 rounded-full border border-gold-border bg-gold-light px-2.5 py-[3px] text-xs font-semibold uppercase tracking-[0.06em] text-gold-dark sm:inline-flex">
                {badge.join(" ")}
              </span>
            ) : null}
            {/* The action and the menu swap at the same breakpoint rather than
                stacking: at 320px the wordmark plus both of them overflows, and
                a header that wraps to two lines is the P1 this file already
                guards against. The action is the first item inside the drawer,
                so nothing is lost by moving it there. */}
            {menu ? <span className="sm:hidden">{menu}</span> : null}
            {right ? <span className={menu ? "hidden sm:inline-flex" : undefined}>{right}</span> : null}
          </div>
        )}
      </div>
    </header>
  );
}
