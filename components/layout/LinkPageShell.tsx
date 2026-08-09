import type { ReactNode } from "react";

import { contactEmail } from "@/lib/env";

import { SiteHeader } from "./SiteHeader";

/**
 * Chrome shared by every emailed page — /rate, /consent, /submit-photos,
 * /onboarding, /join-admin.
 *
 * These pages deliberately differ from the marketing chrome: their V7 nav is a
 * compact 22px wordmark with no strapline, and none of them carries the dark
 * site footer — the closing confidentiality note (V7 `.footer-note`) is all
 * they show. A practitioner arriving from an email to confirm one session is
 * not being recruited.
 */
export function LinkPageShell({
  badge,
  badgeStyle = "pill",
  right,
  width,
  strapline = null,
  email = contactEmail(),
  children,
}: {
  badge: string | readonly string[];
  /** Most flow pages use the gold pill; onboarding uses the lockup + a right slot. */
  badgeStyle?: "pill" | "lockup";
  /** Extra header content (onboarding's "Onboarding · Step 2 of 2"). */
  right?: ReactNode;
  /**
   * The page's column width. Each spec sets its own — 480px for account setup,
   * 720 for rating, 760 for consent, 860 for photos and onboarding — and the
   * header's inner width tracks it so the wordmark aligns with the card.
   */
  width: string;
  /** Wordmark sub-line. Rate/consent/user-setup have none; photos/onboarding pass theirs. */
  strapline?: string | null;
  /** The inbox the closing "questions?" line points at. Defaults to the site's. */
  email?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <SiteHeader
        badge={typeof badge === "string" ? [badge] : badge}
        badgeStyle={badgeStyle}
        right={right}
        width={width}
        strapline={strapline}
        compact
      />
      {/* V7 .page — max-width column with its own 2.5rem 2rem 4rem padding.
          The padding lives on this box (not an outer section), so the card
          content is 64px narrower than the width and the nav logo (which fills
          the full nav-inner width) sits ~32px left of the card, as in V7. */}
      <main className="flex-1">
        <div style={{ maxWidth: width }} className="mx-auto px-8 pt-10 pb-16">
          {children}
          <p className="mt-8 text-center text-sm leading-[1.6] text-ink-faint">
            Confidential · Questions? Reply to the email this link was sent from, or write to{" "}
            <a
              href={`mailto:${email}`}
              /* Inline link: `min-block-size` cannot grow it, so `tap-44` does. */
              className="tap-44 underline underline-offset-2 transition-colors hover:text-ink-muted"
            >
              {email}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
