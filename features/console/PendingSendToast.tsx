"use client";

import { Toast } from "@/components/ui/Toast";
import type { PendingAction } from "@/hooks/useDeferredSend";

/**
 * The toast covering the window before an admin send actually fires (procedure
 * §114), in V7's wording — "Sending in N seconds — click Undo to stop it" —
 * counting down rather than sitting on the number it opened with.
 *
 * The number is `UNDO_WINDOW_SECONDS` and is not restated here. V7 writes the
 * sentence with a literal 15 in it; the window is ten (client, 2026-08-17), and
 * a toast carrying its own copy of the figure is how the two drift apart.
 *
 * The countdown is the point. A static number tells you the window exists; it
 * does not tell you whether you still have time to stop it, which is the only
 * thing being read in the moment.
 *
 * Extracted because three surfaces now show it — row actions, the consent
 * panel's status select, and the team invite — and a hold that reads
 * differently depending on which control opened it is a hold nobody trusts.
 */
export function PendingSendToast({
  pending,
  onUndo,
  tone = "neutral",
}: {
  pending: PendingAction;
  onUndo: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <Toast
      tone={tone}
      message={
        <span className="block">
          <span className="block">{pending.label}</span>
          {/* Opacity rather than a colour token: this sits on ink or on red
              depending on tone, and one muted token cannot serve both. */}
          <span className="block text-xs opacity-70">
            Sending in {pending.secondsLeft} second{pending.secondsLeft === 1 ? "" : "s"} — click Undo
            to stop it
          </span>
        </span>
      }
      action={
        <button
          type="button"
          onClick={onUndo}
          className="rounded-md px-2 py-1 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Undo
        </button>
      }
    />
  );
}
