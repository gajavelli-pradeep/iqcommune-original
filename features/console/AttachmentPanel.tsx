"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/email/attachment-rules";

import { deleteEmailAttachment } from "./actions";
import type { DraftAttachment } from "./draft-kinds";

/**
 * The attach control of the draft dialog (client V8, welcome email).
 *
 * The paperclip sits on the "Click into the text below" line of every email
 * dialog; the panel opens under the message. Empty by default everywhere except
 * the welcome, which arrives with the signed agreement and the three flyers.
 *
 * Two kinds of ✕, because the two kinds of file are different things:
 *   · the agreement is the practitioner's real contract — ✕ takes it off THIS
 *     email only and never touches the record;
 *   · a saved library file — ✕ deletes it from the library (soft delete), so it
 *     leaves every future email. Only its uploader or a global admin may; for
 *     anyone else ✕ just takes it off this email, since files are never locked.
 */

type Confirm = { file: DraftAttachment; mode: "detach" | "delete" } | null;

const formatSize = (bytes: number) =>
  bytes === 0 ? "PDF" : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

const CHIP =
  "inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:size-8";

/** The paperclip on the hint line, with the attached count. */
export function PaperclipButton({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="draft-attachments"
      aria-label={count ? `Attachments, ${count} attached` : "Attachments, none attached"}
      className={`group inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:min-h-8 ${
        open || count ? "border-gold-border bg-gold-light text-gold-dark" : "border-border-strong text-ink-muted hover:border-gold"
      }`}
    >
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden
        className="transition-transform motion-safe:group-hover:-rotate-12"
      >
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      Attach
      {count ? <span className="rounded-full bg-gold px-1.5 text-2xs text-ink">{count}</span> : null}
    </button>
  );
}

/** The nearest ancestor that actually scrolls — the dialog scrolls its overlay. */
function scrollParent(node: HTMLElement | null): HTMLElement | null {
  for (let el = node?.parentElement ?? null; el; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

export function AttachmentPanel({
  files,
  attachedIds,
  onAttachedChange,
  onFilesChange,
  refresh,
}: {
  files: DraftAttachment[];
  attachedIds: string[];
  onAttachedChange: (ids: string[]) => void;
  onFilesChange: (files: DraftAttachment[]) => void;
  /** Re-reads the library after an upload or delete. */
  refresh: () => Promise<DraftAttachment[]>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // The dialog body scrolls, so a panel that opens below the fold would look
  // like a button that did nothing. Bring it fully into view.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const wrap = wrapRef.current;
      const scroller = scrollParent(wrap);
      if (!wrap || !scroller) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wrapBottom = wrap.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: wrapBottom - scroller.clientHeight + 16, behavior: reduce ? "auto" : "smooth" });
    }, 260);
    return () => window.clearTimeout(timer);
  }, []);

  // Escape cancels the confirmation, not the whole dialog. Captured on window so
  // it runs before the dialog's own document-level listener.
  useEffect(() => {
    if (!confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setConfirm(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirm]);

  const attached = files.filter((f) => attachedIds.includes(f.id));
  const saved = files.filter((f) => f.kind === "library" && !attachedIds.includes(f.id));

  async function upload(list: FileList | File[]) {
    setError(null);
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(list)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(`${file.name} is over 2 MB.`);
          continue;
        }
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/email-attachments", { method: "POST", body });
        const result = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!response.ok || !result.id) {
          setError(result.error ?? "Upload failed.");
          continue;
        }
        added.push(result.id);
      }
      if (added.length) {
        onFilesChange(await refresh());
        onAttachedChange([...attachedIds, ...added]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmed() {
    if (!confirm) return;
    const { file, mode } = confirm;
    setError(null);
    setBusy(true);
    try {
      if (mode === "delete") {
        await deleteEmailAttachment(file.id);
        onFilesChange(await refresh());
      }
      onAttachedChange(attachedIds.filter((id) => id !== file.id));
      if (preview === file.id) setPreview(null);
      setConfirm(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete that file.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const askRemove = (file: DraftAttachment) =>
    setConfirm({ file, mode: file.kind === "library" && file.canDelete ? "delete" : "detach" });

  return (
    <div
      ref={wrapRef}
      id="draft-attachments"
      className="mt-3 rounded-lg border border-border bg-surface-soft p-3 motion-safe:animate-fade-up"
    >
      {attached.length === 0 ? (
        <p className="px-1 pb-2 text-sm text-ink-faint">No files attached to this email.</p>
      ) : (
        <ul className="space-y-1.5">
          {attached.map((file) => (
            <li key={file.id} className="rounded-md border border-border bg-surface">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span aria-hidden className="text-ink-faint">
                  {file.contentType === "application/pdf" ? "PDF" : "IMG"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {file.label} <span className="text-xs text-ink-faint">{formatSize(file.sizeBytes)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPreview(preview === file.id ? null : file.id)}
                  aria-label={`Preview ${file.label}`}
                  aria-pressed={preview === file.id}
                  className={CHIP}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button type="button" onClick={() => askRemove(file)} aria-label={`Remove ${file.label}`} className={CHIP}>
                  ✕
                </button>
              </div>
              {preview === file.id ? (
                <div className="border-t border-border p-2 motion-safe:animate-fade-up">
                  {file.contentType === "application/pdf" ? (
                    <iframe src={file.previewUrl} title={`Preview of ${file.label}`} className="h-72 w-full rounded bg-surface" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- an authenticated, private, one-off preview; next/image would proxy it through the optimiser
                    <img src={file.previewUrl} alt={file.label} className="mx-auto max-h-72 rounded" />
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {saved.length ? (
        <div className="mt-3">
          <p className="mb-1 text-2xs uppercase tracking-wide text-ink-faint">Saved files</p>
          <ul className="flex flex-wrap gap-1.5">
            {saved.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => onAttachedChange([...attachedIds, file.id])}
                  className="min-h-11 rounded-full border border-border-strong px-3 text-xs text-ink transition-colors hover:border-gold hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:min-h-8"
                >
                  + {file.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
        }}
        className={`mt-3 flex flex-wrap items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-center text-sm transition-colors ${
          dragging ? "border-gold bg-gold-light text-gold-dark" : "border-border-strong text-ink-muted"
        }`}
      >
        <span>{busy ? "Working…" : "Drop a PDF, PNG or JPG here, or"}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-full bg-ink px-4 text-xs font-medium text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-45 pointer-fine:min-h-8"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <p className="mt-1.5 text-2xs text-ink-faint">Up to 2 MB each; about 4 MB in total goes in one email.</p>

      <p aria-live="polite" role={error ? "alert" : undefined} className="mt-1 text-xs text-red">
        {error}
      </p>

      {confirm ? (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-scrim p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="attach-confirm-title"
            className="w-full max-w-[360px] rounded-[10px] bg-surface p-5 shadow-xl motion-safe:animate-fade-up"
          >
            <h3 id="attach-confirm-title" className="text-base font-semibold text-ink">
              {confirm.mode === "delete"
                ? "Permanently delete this file?"
                : confirm.file.kind === "agreement"
                  ? "Send the welcome email without the agreement?"
                  : "Remove this file from this email?"}
            </h3>
            <p className="mt-2 text-sm leading-[1.6] text-ink-muted">
              {confirm.mode === "delete"
                ? `“${confirm.file.label}” will be removed from all future emails. This can’t be undone from the console.`
                : confirm.file.kind === "agreement"
                  ? "The signed agreement stays on the practitioner’s record — it just won’t be attached to this email."
                  : `“${confirm.file.label}” stays saved and can be attached again.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirm(null)}
                className="min-h-11 rounded-full border border-border-strong px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:min-h-9"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmed()}
                className="min-h-11 rounded-full bg-red px-4 text-sm font-medium text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-45 pointer-fine:min-h-9"
              >
                {confirm.mode === "delete" ? "Delete" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
