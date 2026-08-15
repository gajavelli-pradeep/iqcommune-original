"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { waLink } from "@/lib/whatsapp/link";

import { composeDraft, recordWhatsAppOpened } from "./actions";
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
 * The WhatsApp tab shows the delivered document's copy for the same send, and
 * its only exit is the clipboard — there is no provider, no `wa.me` link and no
 * phone number, so an admin copies the text and sends it from their own
 * handset. That is one better than the prototype, which hid the Copy button in
 * this mode and so trapped the text in the dialog.
 *
 * It is deliberately not editable. The email half is edited because the edit is
 * what gets sent; nothing here is sent, so an edit would be discarded the
 * moment the dialog closed — the defect noted in point 2, reintroduced.
 *
 * `request-cancellation` has no WhatsApp copy in the document, so that send
 * shows no tab rather than an invented body.
 */
type Channel = "email" | "whatsapp";
type CopyState = "idle" | "copied" | "failed";

/** The two tabs, at the dialog's own scale — the console has no segmented
 *  control to reuse, and the public `Button` variants are all page-sized.
 *  `min-h-11` keeps the target at 44px under a coarse pointer. */
const TAB_BASE =
  "min-h-11 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const TAB_ON = "bg-ink text-surface";
const TAB_OFF = "text-ink-muted hover:bg-surface-soft";

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
  const [channel, setChannel] = useState<Channel>("email");
  const [copy, setCopy] = useState<CopyState>("idle");

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

  /**
   * Null when there is no usable number, which is what hides the button.
   *
   * Built from the draft's own WhatsApp copy rather than the edited body: this
   * half is not editable, and the email body is a different message — sending it
   * over WhatsApp would deliver the subject line's worth of formality into a
   * chat window.
   */
  const waHref = draft?.whatsapp ? waLink(draft.phone, draft.whatsapp) : null;

  /**
   * Logged, but not counted as sent.
   *
   * All that is knowable from here is that WhatsApp was opened — whether the
   * admin pressed send inside it never comes back to us. So this leaves a trace
   * an admin can read, and deliberately does not advance the row's next step,
   * which would have the console claim a delivery it cannot see.
   */
  const onWhatsApp = () => {
    void recordWhatsAppOpened(kind, id);
  };

  /** The Clipboard API is absent on an insecure origin and in older browsers.
   *  The textarea stays selectable either way, so a failure says so rather
   *  than leaving the admin to wonder whether the copy took. */
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      variant="console"
      title={chrome.title}
      description={draft ? `Send to ${draft.to}` : "Preparing the draft…"}
      footer={
        // The footer belongs to whichever tab is open. It used to be the email
        // send whatever was on screen, so reading the WhatsApp copy and pressing
        // the only button sent the email instead — the two halves are different
        // messages on different channels, and one button cannot mean both.
        channel === "whatsapp" ? (
          <>
            <p className="flex-1 text-xs leading-[1.5] text-ink-faint">
              {waHref
                ? "Opens WhatsApp with this message ready — you still press send there."
                : "No number on file for this recipient, so WhatsApp cannot be opened. Copy the message instead."}
            </p>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {/* WhatsApp's own mark, and its own green. Ink text rather than
                    white: white on #25D366 is 1.8:1 and fails AA. */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a13.7 13.7 0 0 1-6.6-5.7c-.5-.8-.8-1.7-.8-2.5 0-.9.4-1.6.8-2 .2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.5.9 1.2 1.6 2 2.1.3.2.5.2.6 0l.6-.7c.2-.2.3-.2.5-.1l1.8.9c.2.1.3.2.3.3.1.3 0 .6-.3 1.2z" />
                </svg>
                Open in WhatsApp
              </a>
            ) : null}
          </>
        ) : (
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
        )
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
          {draft.whatsapp ? (
            <div role="tablist" aria-label="Message channel" className="mb-4 flex gap-1">
              {(["email", "whatsapp"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  id={`draft-tab-${option}`}
                  aria-selected={channel === option}
                  aria-controls={`draft-panel-${option}`}
                  onClick={() => {
                    setChannel(option);
                    setCopy("idle");
                  }}
                  className={`${TAB_BASE} ${channel === option ? TAB_ON : TAB_OFF}`}
                >
                  {option === "email" ? "Email" : "WhatsApp"}
                </button>
              ))}
            </div>
          ) : null}

          <div
            role="tabpanel"
            id="draft-panel-email"
            aria-labelledby="draft-tab-email"
            hidden={channel !== "email"}
          >
            {/* No "Re:" line. V7 prints a second, shorter subject here and the
                editable Subject field below holds the real one — so the dialog
                showed two subjects that disagreed, and only the lower one was ever
                sent (appendix B10). Showing the true subject twice would be
                honest but redundant; the field below is already the truth and is
                the one the admin can change. */}
            <div className="mb-4 rounded-lg bg-surface-soft px-4 py-3 text-sm leading-[1.7] text-ink-muted">
              <span className="font-medium text-ink">To:</span> {draft.to}
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
          </div>

          {draft.whatsapp ? (
            <div
              role="tabpanel"
              id="draft-panel-whatsapp"
              aria-labelledby="draft-tab-whatsapp"
              hidden={channel !== "whatsapp"}
            >
              <p className="mb-3 rounded-lg bg-surface-soft px-4 py-3 text-sm leading-[1.7] text-ink-muted">
                Copy this and send it from your own WhatsApp — we have no WhatsApp connection, so
                nothing here goes out on its own. <span className="font-medium text-ink">Click to send</span>{" "}
                delivers the email only.
              </p>

              <label htmlFor="draft-whatsapp" className="sr-only">
                WhatsApp message
              </label>
              <textarea
                id="draft-whatsapp"
                readOnly
                value={draft.whatsapp}
                rows={14}
                className="block w-full resize-y rounded-lg border border-border bg-surface-soft p-4 text-base leading-[1.85] text-ink-muted focus:border-gold focus:outline-none"
              />

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(draft.whatsapp ?? "")}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong px-4 text-sm font-medium text-ink transition-colors hover:border-gold hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy message
                </button>
                <p aria-live="polite" className="text-xs text-ink-faint">
                  {copy === "copied" ? "Copied to clipboard." : null}
                  {copy === "failed" ? "Could not copy — select the text above instead." : null}
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}
