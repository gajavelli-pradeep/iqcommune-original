import type { TokenFailure } from "@/lib/tokens";

/**
 * The state the spec does not draw.
 *
 * Its mockup assumes a valid link and reads the session from query parameters,
 * so there is nothing to show when the link is wrong. In production that is the
 * common case — links expire, get forwarded, get truncated by mail clients —
 * and it must not render as an empty page or, worse, a working form.
 *
 * The reason is stated because each one has a different remedy, but none of
 * them reveals whether the referenced session exists.
 */

const MESSAGES: Record<TokenFailure, { title: string; detail: string }> = {
  malformed: {
    title: "This link isn't complete",
    detail:
      "It may have been cut short by your email client. Try opening it again from the original email.",
  },
  "bad-signature": {
    title: "This link isn't valid",
    detail: "It may have been altered or copied incorrectly. Open it again from the original email.",
  },
  "wrong-kind": {
    title: "This link isn't valid",
    detail: "It may have been altered or copied incorrectly. Open it again from the original email.",
  },
  expired: {
    title: "This link has expired",
    // Generic across all five flows (audit M22): this component is shared, so it
    // must not name one of them ("Rating links…").
    detail: "These links are open for a limited time. Reply to the email and we'll send a new one.",
  },
};

export function InvalidLink({ reason }: { reason: TokenFailure }) {
  const { title, detail } = MESSAGES[reason];
  return (
    <section className="rounded-lg border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-light text-gold-dark">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-base leading-[1.6] text-ink-muted">{detail}</p>
    </section>
  );
}
