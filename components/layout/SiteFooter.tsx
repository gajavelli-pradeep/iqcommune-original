import Link from "next/link";
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
export function SiteFooter() {
  return (
    <footer className="bg-ink-deep px-8 py-8 text-center text-base text-on-dark-muted">
      <div className="mx-auto max-w-page">
        <div className="mb-5 border-b border-on-dark-divider pb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-caps text-gold">
            Are you a finance professional?
          </p>
          <Link
            href="/practitioners"
            className="inline-flex items-center gap-[7px] border-b border-gold-rule pb-[2px] text-md font-medium text-on-dark transition-colors hover:border-gold-rule-strong hover:text-gold-bright focus-visible:border-gold-rule-strong focus-visible:text-gold-bright"
          >
            Teach what you practise — join the iqcommune practitioner network
            <ArrowRightIcon />
          </Link>
        </div>

        <p>
          {/* Explicit string literals, not loose JSX text: JSX strips the space
              that should sit between </strong> and the em dash, silently
              rendering "iqcommune— Where". Caught by measurement, not by eye. */}
          <strong className="font-medium text-on-dark-strong">iqcommune</strong>
          {" — Where financial intelligence connects.  ·  "}
          <a
            href="mailto:hello@iqcommune.com"
            className="transition-colors hover:text-on-dark-bright focus-visible:text-on-dark-bright"
          >
            hello@iqcommune.com
          </a>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} iqcommune. All rights reserved.</p>
      </div>
    </footer>
  );
}
