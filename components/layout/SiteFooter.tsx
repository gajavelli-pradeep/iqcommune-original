import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/ArrowRightIcon";
import { LegalLinks, Separator } from "@/components/legal/LegalLinks";

/**
 * Shared site footer — the landing page, the practitioner site and /login.
 *
 * Not the five emailed link pages: those use LinkPageShell, whose foot is a
 * "Confidential · questions?" line rather than a site footer. So "standard"
 * here means the three pages that have a footer at all, which is what the
 * client's "both footers" asked for.
 *
 * The bottom two lines are the client's standard (2026-07-23) and are the same
 * on every page: Privacy Policy · Terms of Use · inbox, then the copyright.
 * This replaced a per-page wordmark-and-tagline line, which is why the
 * practitioner site no longer says "practitioner network" here — "standard"
 * was the requirement, so the variation went.
 *
 * Three deviations from the V7 HTML, all deliberate:
 *
 * 1. The year is computed, not the literal "2025" in the spec. A footer showing
 *    last year reads as an abandoned site, and the spec was authored in 2025.
 *    The content-parity gate allowlists this line for that reason.
 * 2. Body text uses --color-on-dark-muted (0.5 alpha) where the spec has 0.3.
 *    0.3 measures 2.60:1 on this background and fails WCAG AA. See globals.css.
 * 3. The legal links and the "InvestQ Commune" wording postdate the spec.
 */
export function SiteFooter({
  email = "hello@iqcommune.com",
  top = true,
}: {
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

        {/* The client's standard footer, identical on every page: the two legal
            documents and the inbox on one line, the copyright on the next.
            Inline flow rather than flex — it wraps on its own at 320px, and the
            spaces around each separator stay real text rather than padding a
            screen reader cannot hear. */}
        <p>
          <LegalLinks />
          <Separator />
          <a
            href={`mailto:${email}`}
            className="tap-44 underline-offset-2 transition-colors hover:text-on-dark-bright hover:underline focus-visible:text-on-dark-bright focus-visible:underline"
          >
            {email}
          </a>
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()}. InvestQ Commune. All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
