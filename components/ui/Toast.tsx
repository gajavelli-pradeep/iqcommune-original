"use client";

import type { ReactNode } from "react";

/**
 * A transient toast, fixed above everything at the toast layer of the z-scale.
 * Used by the console's deferred-send window (procedure §114): "clicking Send
 * doesn't fire it instantly — you get a 15-second window with an Undo option."
 *
 * `action` is the optional Undo control. `tone` follows the reserved semantics.
 */
export function Toast({
  message,
  action,
  tone = "neutral",
}: {
  message: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-green-light bg-green-light text-green"
      : tone === "danger"
        ? "border-red bg-red-light text-red"
        : "border-border-strong bg-ink text-surface";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[var(--z-toast)] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex items-center gap-4 rounded-lg border px-4 py-3 text-base shadow-modal ${toneClass}`}
      >
        <span>{message}</span>
        {action}
      </div>
    </div>
  );
}
