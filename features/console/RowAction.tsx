"use client";

import { Toast } from "@/components/ui/Toast";
import { useDeferredSend } from "@/hooks/useDeferredSend";

/**
 * A single console row action with the 15-second Undo window (procedure §114).
 * Clicking opens the window and shows a toast; the server action fires only if
 * it is not undone. Rendered inside a `ColumnDef` gated by the `mutate`
 * capability, so a view-only role never receives it.
 */
export function RowAction({
  action,
  label,
  pendingMessage,
  tone = "neutral",
}: {
  action: () => Promise<void>;
  label: string;
  /** Shown in the toast while the Undo window is open, e.g. "Matching request…". */
  pendingMessage: string;
  tone?: "neutral" | "danger";
}) {
  const { pending, schedule, undo } = useDeferredSend();

  return (
    <>
      <button
        type="button"
        onClick={() => schedule(action, pendingMessage)}
        disabled={Boolean(pending)}
        className={`min-h-11 rounded-md px-2 text-sm font-medium underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50 ${
          tone === "danger" ? "text-red hover:text-red/80" : "text-gold-dark hover:text-ink"
        }`}
      >
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
