"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";

import { composeDraft } from "./actions";
import { DRAFT_CHROME, type Draft, type DraftKind, type DraftOverride } from "./draft-kinds";

/**
 * V7's `.draft-modal`, in its "automated send" mode: the admin sees the real
 * subject, body and recipient, edits whatever they like, and nothing leaves
 * until they press Send.
 *
 * Two deliberate departures from the prototype, both recorded so they are not
 * "corrected" back:
 *
 * 1. **Real form controls, not `contenteditable`.** V7 edits three
 *    `contenteditable` divs. An input and a textarea carry the same visual
 *    contract, are labelled, announce themselves to a screen reader, and do not
 *    fight React over the DOM.
 * 2. **The edit is actually sent.** V7's `clickToSend` never reads the edited
 *    text back — it fires a closure captured when the dialog opened, so every
 *    edit is silently discarded. Here the edited subject and body are handed to
 *    the server action, which is the entire point of offering the edit.
 *
 * The WhatsApp tab is not built. In the prototype it is a second text buffer
 * whose only exit is the clipboard — no `wa.me` link, no phone number, no send —
 * and in this same automated mode its Copy button is hidden, so the text cannot
 * leave the dialog at all. Building it means inventing eleven more pieces of
 * copy while the client's real templates are still outstanding, so it waits for
 * them. The client called it optional.
 */
export function DraftModal({
  onClose,
  kind,
  id,
  onSend,
}: {
  onClose: () => void;
  kind: DraftKind;
  id: string;
  /** Handed the edited text; the caller owns the Undo window and the send. */
  onSend: (draft: DraftOverride) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Mounted only while open (see `RowAction`), so every open starts from these
  // initial values. That is why there is no reset here: clearing state
  // synchronously in an effect cascades renders, and remounting is both
  // cheaper and the reason a stale row's copy can never flash on screen.
  useEffect(() => {
    let cancelled = false;
    composeDraft(kind, id)
      .then((composed) => {
        if (cancelled) return;
        if (!composed) {
          setError("That record no longer exists, so there is nothing to send.");
          return;
        }
        setDraft(composed);
        setSubject(composed.subject);
        setBody(composed.body);
      })
      .catch(() => {
        if (!cancelled) setError("The draft could not be prepared. Close this and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const chrome = DRAFT_CHROME[kind];
  const ready = Boolean(draft) && subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      variant="console"
      title={chrome.title}
      description={draft ? `Send to ${draft.to}` : "Preparing the draft…"}
      footer={
        <>
          <p className="flex-1 text-xs leading-[1.5] text-ink-faint">
            Review before sending — nothing goes out until you click Send.
          </p>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSend({ subject: subject.trim(), body })}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Click to send
          </button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-base text-red">
          {error}
        </p>
      ) : !draft ? (
        // A skeleton, not a blank panel: the dialog is already open by now, and
        // an empty box reads as a draft with nothing in it.
        <div aria-busy className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-surface-soft" />
          <div className="h-48 animate-pulse rounded-lg bg-surface-soft" />
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg bg-surface-soft px-4 py-3 text-sm leading-[1.7] text-ink-muted">
            <span className="font-medium text-ink">To:</span> {draft.to}
            <br />
            <span className="font-medium text-ink">Re:</span> {chrome.subject}
          </div>

          <p className="mb-1.5 flex items-center gap-[5px] text-2xs text-ink-faint">
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Click into the text below to edit before sending
          </p>

          <div className="mb-3 flex items-baseline gap-1.5 border-b border-border pb-2.5">
            <label htmlFor="draft-subject" className="shrink-0 text-base font-semibold text-ink">
              Subject:
            </label>
            <input
              id="draft-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 border-b border-dashed border-border-strong bg-transparent px-0.5 py-px text-base font-semibold text-ink focus:border-gold focus:outline-none"
            />
          </div>

          <label htmlFor="draft-body" className="sr-only">
            Message
          </label>
          <textarea
            id="draft-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            spellCheck={false}
            rows={14}
            className="block w-full resize-y rounded-lg border border-border bg-surface-soft p-4 text-base leading-[1.85] text-ink-muted focus:border-gold focus:bg-surface focus:outline-none"
          />

          {!ready ? (
            <p role="alert" className="mt-2 text-xs text-red">
              A subject and a message are both needed before this can be sent.
            </p>
          ) : null}
        </>
      )}
    </Modal>
  );
}
