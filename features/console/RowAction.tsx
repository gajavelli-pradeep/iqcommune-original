"use client";

import { useState, type ReactNode } from "react";

import { useDeferredSend, useSendHeld } from "@/hooks/useDeferredSend";

import type { ActionResult } from "./actions";
import { DraftModal } from "./DraftModal";
import type { DraftKind, DraftOverride } from "./draft-kinds";
import { PendingSendToast } from "./PendingSendToast";

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
 *   `dark`    — V7 `.btn-dark.btn-sm`: ink fill, used for the outbound sends.
 *   `primary` — V7 `.gen-link-btn`: full-width gold, leading icon, gold glow.
 *
 * `primary` takes an ink label, not V7's white: white on `--color-gold` is
 * 2.1:1 and fails AA. Recorded here so it is not "corrected" back (CLAUDE.md).
 * `dark` keeps white — white on `--color-ink` is 17:1.
 */
export function RowAction({
  action,
  label,
  pendingMessage,
  tone = "neutral",
  variant = "link",
  icon,
  draft,
}: {
  /**
   * Widened from `Promise<void>` so a send can say it failed.
   *
   * The Undo toast used to be the whole of the feedback: it appeared, it
   * elapsed, and whatever happened next was invisible. Actions that still
   * return void are unaffected — the union accepts them — but any that report
   * a refusal now have somewhere for it to go.
   */
  action: (draft?: DraftOverride) => Promise<void | ActionResult>;
  label: string;
  /** Shown in the toast while the Undo window is open, e.g. "Matching request…". */
  pendingMessage: string;
  tone?: "neutral" | "danger";
  variant?: "link" | "ghost" | "ghost-block" | "dark" | "primary" | "gold-pill" | "red-pill";
  icon?: ReactNode;
  /**
   * Show the message first (client, 2026-08-13). With this set, clicking opens
   * the draft dialog instead of starting the Undo window; the window starts
   * when the admin presses Send in there, carrying whatever they edited.
   *
   * The Undo window is kept for *every* kind, where V7 dropped it on the
   * internal ones. It costs nothing beside a dialog the admin has already read,
   * and removing a working safety net to match a prototype is the wrong trade.
   */
  draft?: { kind: DraftKind; id: string };
}) {
  // What this button would send, and to whom. Two buttons offering the same
  // message about the same record are the same intent, however far apart they
  // sit — `draft` already carries both halves, so nothing new has to be passed
  // down to say so. Actions without a draft keep their hold to themselves.
  const key = draft ? `${draft.kind}:${draft.id}` : undefined;
  const { pending, schedule, undo } = useDeferredSend(key);
  const held = useSendHeld(key);
  const [drafting, setDrafting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /** Runs the action and keeps whatever it had to say about itself. */
  const run = (edited?: DraftOverride) => async () => {
    setError(null);
    const result = await action(edited);
    if (result && !result.ok) setError(result.message);
  };

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
    dark: `flex w-full items-center justify-center gap-[7px] rounded-lg bg-ink px-3.5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 ${focus}`,
    primary: `flex w-full items-center justify-center gap-[7px] rounded-lg bg-gold px-3.5 py-2.5 text-sm font-semibold text-ink shadow-gold transition-[filter] hover:brightness-[1.08] ${focus}`,
    // V7 `.btn-gold.btn-sm`: the same pill as `ghost`, turned gold. Used where
    // an action becomes available rather than appearing — the consent panel's
    // two follow-ons after a confirmation is generated.
    "gold-pill": `inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-xs font-medium text-ink shadow-gold transition-[filter] hover:brightness-[1.08] ${focus}`,
    // The same pill again, filled red with a white label — V7 styles the
    // Agreements welcome send inline that way (`background:var(--red);
    // color:#fff;border:none`) rather than through a class, and it is the only
    // control it draws so. Distinct from `ghost` + `tone="danger"`, which is red
    // *text* on a surface pill and reads as a destructive action; this one is
    // neither destructive nor quiet. White on `--color-red` is 5.4:1, so unlike
    // gold it keeps V7's white label.
    "red-pill": `inline-flex items-center gap-1.5 rounded-full bg-red px-2.5 py-1 text-xs font-medium text-surface transition-[filter] hover:brightness-[1.08] ${focus}`,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (draft ? setDrafting(true) : schedule(run(), pendingMessage))}
        // `held` covers this button's own window too, since it takes the key.
        // The countdown toast is fixed to the viewport, so an admin who finds
        // the twin greyed out is already looking at what is holding it, and at
        // the Undo that releases it.
        disabled={Boolean(pending) || held}
        title={held && !pending ? "Already sending — see the countdown below" : undefined}
        className={CLASSES[variant]}
      >
        {variant !== "link" && icon ? icon : null}
        {label}
      </button>

      {draft && drafting ? (
        <DraftModal
          onClose={() => setDrafting(false)}
          kind={draft.kind}
          id={draft.id}
          onSend={(edited) => {
            setDrafting(false);
            schedule(run(edited), pendingMessage);
          }}
        />
      ) : null}

      {error ? (
        <p role="alert" className="mt-1 max-w-[200px] text-3xs text-red">
          {error}
        </p>
      ) : null}

      {pending ? (
        <PendingSendToast
          pending={pending}
          onUndo={undo}
          tone={tone === "danger" ? "danger" : "neutral"}
        />
      ) : null}
    </>
  );
}
