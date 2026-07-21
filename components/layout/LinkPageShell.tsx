import type { ReactNode } from "react";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Chrome shared by every emailed page — /rate, /consent, /submit-photos,
 * /onboarding, /join-admin.
 *
 * Extracted at its second use. All five are a narrow column of cards under a
 * badged header, closing with the same confidentiality note, and none of them
 * carries the footer's cross-site call to action: a practitioner arriving from
 * an email to confirm one session is not being recruited.
 */
export function LinkPageShell({
  badge,
  width,
  children,
}: {
  badge: string | readonly string[];
  /**
   * The page's column width. Each spec sets its own — 480px for account setup,
   * 720 for rating, 760 for consent, 860 for photos and onboarding — and the
   * header's inner width tracks it so the wordmark aligns with the card.
   * Collapsing all five into one 520px default was a shared component losing
   * the variation it existed to carry.
   */
  width: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <SiteHeader badge={typeof badge === "string" ? [badge] : badge} width={width} />
      <main className="flex-1 px-4 py-10 sm:px-8">
        <div style={{ maxWidth: width }} className="mx-auto">
          {children}
          <p className="mt-6 text-center text-sm leading-[1.6] text-ink-faint">
            Confidential · Questions? Reply to the email this link was sent from, or write to{" "}
            <a
              href="mailto:hello@iqcommune.com"
              className="underline underline-offset-2 transition-colors hover:text-ink-muted"
            >
              hello@iqcommune.com
            </a>
          </p>
        </div>
      </main>
      <SiteFooter top={false} />
    </div>
  );
}
