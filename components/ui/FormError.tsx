import type { ReactNode } from "react";

/**
 * Inline form error alert — the boxed red message that recurs across every flow
 * form (audit M3, ~10 sites). `role="alert"` so screen readers speak it the
 * moment it appears; a red border alone is silent. Renders nothing when there
 * is no message, so callers can mount it unconditionally.
 *
 * Red is reserved for true errors only (CLAUDE.md) — never a routine count or a
 * "needs action" state, which is amber.
 */
export function FormError({ message, children }: { message?: string; children?: ReactNode }) {
  const content = children ?? message;
  if (!content) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-red bg-red-light px-3 py-2 text-sm leading-[1.5] text-red"
    >
      {content}
    </div>
  );
}
