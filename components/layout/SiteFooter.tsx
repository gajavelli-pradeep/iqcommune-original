import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/ArrowRightIcon";

/**
 * Shared site footer — used by all eight public pages.
 *
 * Two deviations from the V7 HTML, both deliberate:
 *
 * 1. The year is computed, not the literal "2025" in the spec. A footer showing
 *    last year reads as an abandoned site, and the spec was authored in 2025.
 *    The content-parity gate allowlists this line for that reason.
 * 2. Body text uses --color-on-dark-muted (0.5 alpha) where the spec has 0.3.
 *    0.3 measures 2.60:1 on this background and fails WCAG AA. See globals.css.
 */
export function SiteFooter({
  tagline = "Insight Quotient - Unleashed.",
  email = "hello@iqcommune.com",
  top = true,
}: {
  /** Follows the wordmark. The practitioner site says "practitioner network". */
  tagline?: string;
  /** Public pages and the practitioner site use different inboxes. */
  email?: string;
  /**
   * The footer's call-to-action. `true` renders the learner-site default (join
   * the practitioner network); a node replaces it; `false` removes it.
   *
   * It is a slot rather than a boolean because the practitioner spec puts its
   * own link here — back to the learner site — and an earlier version passed
   * `false`, silently dropping a spec element and leaving that page with no
   * route to the learner site at all below 640px.
   */
  top?: boolean | ReactNode;
} = {}) {
  return (
    <footer className="bg-ink-deep px-8 py-8 text-center text-base text-on-dark-muted">
      <div className="mx-auto max-w-page">
        {top === false ? null : top !== true ? (
          /* A custom CTA (the practitioner site's "See iqcommune for Learners"
             pill). V7 centres it with a small gap and no divider. */
          <div className="mb-3 flex justify-center">{top}</div>
        ) : (
        <div className="mb-5 border-b border-on-dark-divider pb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-caps text-gold">
            Are you a finance professional?
          </p>
          {/* Inline flow, not inline-flex. As a flex row the text wraps at
              narrow widths while the arrow stays a sibling item, so it detaches
              and floats vertically centred beside the block. Inline keeps it
              trailing the last word at every width. */}
          <Link
            href="/practitioners"
            /* `tap-44`, not padding: the link is inline by the reasoning
               above, so `min-block-size` cannot touch it, and on one line it
               draws only 31px tall. The pseudo-element adds the hit area
               without altering the line box the comment above protects. */
            className="tap-44 border-b border-gold-rule pb-[2px] text-md font-medium text-on-dark transition-colors hover:border-gold-rule-strong hover:text-gold-bright focus-visible:border-gold-rule-strong focus-visible:text-gold-bright"
          >
            Teach what you practise — join the iqcommune practitioner network
            <ArrowRightIcon className="ml-[7px] inline-block align-middle" />
          </Link>
        </div>
        )}

        <p>
          {/* Explicit string literals, not loose JSX text: JSX strips the space
              that should sit between </strong> and the em dash, silently
              rendering "iqcommune— Where". Caught by measurement, not by eye. */}
          <strong className="font-medium text-on-dark-strong">iqcommune</strong>
          {` — ${tagline}  ·  `}
          <a
            href={`mailto:${email}`}
            className="tap-44 transition-colors hover:text-on-dark-bright focus-visible:text-on-dark-bright"
          >
            {email}
          </a>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} iqcommune. All rights reserved.</p>
      </div>
    </footer>
  );
}
