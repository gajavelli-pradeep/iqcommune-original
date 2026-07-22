"use client";

import type { ReactNode } from "react";

import { Toast } from "@/components/ui/Toast";
import { useDeferredSend } from "@/hooks/useDeferredSend";

/**
 * A single console row action with the 15-second Undo window (procedure §114).
 * Clicking opens the window and shows a toast; the server action fires only if
 * it is not undone. Rendered inside a `ColumnDef` gated by the `mutate`
 * capability, so a view-only role never receives it.
 *
 * One behaviour, four looks — each is a class the V7 console actually uses, not
 * a generic button with options:
 *   `link`    — the underline text action in the pipeline tables (default).
 *   `ghost`   — V7 `.btn-ghost.btn-xs`: an inline hairline pill (Download/Delete).
 *   `ghost-block` — V7 `.btn-ghost.btn-sm` inside a detail card, full width.
 *   `primary` — V7 `.gen-link-btn`: full-width gold, leading icon, gold glow.
 *
 * `primary` takes an ink label, not V7's white: white on `--color-gold` is
 * 2.1:1 and fails AA. Recorded here so it is not "corrected" back (CLAUDE.md).
 */
export function RowAction({
  action,
  label,
  pendingMessage,
  tone = "neutral",
  variant = "link",
  icon,
}: {
  action: () => Promise<void>;
  label: string;
  /** Shown in the toast while the Undo window is open, e.g. "Matching request…". */
  pendingMessage: string;
  tone?: "neutral" | "danger";
  variant?: "link" | "ghost" | "ghost-block" | "primary";
  icon?: ReactNode;
}) {
  const { pending, schedule, undo } = useDeferredSend();

  const focus =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

  const link =
    tone === "danger" ? "text-red hover:text-red/80" : "text-gold-dark hover:text-ink";

  const CLASSES: Record<NonNullable<typeof variant>, string> = {
    link: `min-h-11 rounded-md px-2 text-sm font-medium underline underline-offset-4 transition-colors ${focus} ${link}`,
    ghost: `inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-soft ${focus} ${
      tone === "danger" ? "text-red hover:text-red" : "text-ink-muted hover:text-ink"
    }`,
    "ghost-block": `flex w-full items-center justify-center gap-1.5 rounded-lg border bg-surface px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-soft ${focus} ${
      tone === "danger"
        ? "border-red-edge text-red hover:text-red"
        : "border-border-strong text-ink-muted hover:text-ink"
    }`,
    primary: `flex w-full items-center justify-center gap-[7px] rounded-lg bg-gold px-3.5 py-2.5 text-sm font-semibold text-ink shadow-gold transition-[filter] hover:brightness-[1.08] ${focus}`,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => schedule(action, pendingMessage)}
        disabled={Boolean(pending)}
        className={CLASSES[variant]}
      >
        {variant !== "link" && icon ? icon : null}
        {label}
      </button>

      {pending ? (
        <Toast
          message={pending.label}
          tone={tone === "danger" ? "danger" : "neutral"}
          action={
            <button
              type="button"
              onClick={undo}
              className="rounded-md px-2 py-1 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Undo
            </button>
          }
        />
      ) : null}
    </>
  );
}
