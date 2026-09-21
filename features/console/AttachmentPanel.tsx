"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/email/attachment-rules";

import { deleteEmailAttachment } from "./actions";
import type { DraftAttachment } from "./draft-kinds";

/**
 * The attach control of the draft dialog, after the client's V8 mock-up
 * (`.attach-toggle`, `.attach-panel`, `.file-row`, `.dropzone`).
 *
 * The "Attachments" button sits on the "Click into the text below" line of
 * every email dialog; the panel opens under the message. Empty by default
 * everywhere except the welcome, which arrives with the signed agreement and
 * the three flyers. Each row has the V8's eye (preview) and bin (remove).
 *
 * Deliberate departures from the mock-up, recorded so they are not "corrected":
 *   · the bin opens a confirmation first (client, this thread) — the mock-up
 *     removes on click;
 *   · nothing is locked: the agreement's "Auto" tag says where it came from,
 *     not that it must stay;
 *   · the count badge takes an ink label on gold — white on gold fails AA;
 *   · the panel fades in rather than animating `max-height`, which is a layout
 *     property; and files are really uploaded, previewed by URL, not by blob.
 *
 * Two kinds of removal, because the two kinds of file are different things:
 *   · the agreement is the practitioner's real contract — the bin takes it off
 *     THIS email only and never touches the record;
 *   · a saved library file — the bin deletes it (soft), so it leaves every
 *     future email. Only its uploader or a global admin may; for anyone else
 *     it just takes the file off this email.
 */

type Confirm = { file: DraftAttachment; mode: "detach" | "delete" } | null;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function noteFor(file: DraftAttachment): string {
  if (file.kind === "agreement") return "Auto-attached · signed agreement";
  if (file.isDefault) return "Default · sent with every welcome email";
  return `${formatSize(file.sizeBytes)} · saved for reuse`;
}

function removedNotice({ file, mode }: NonNullable<Confirm>): string {
  if (mode === "delete") return "Removed from the library.";
  if (file.kind === "agreement") return "Signed agreement removed — add a replacement below if needed.";
  return "Removed from this email.";
}

function confirmCopy({ file, mode }: NonNullable<Confirm>): { title: string; body: string } {
  if (mode === "delete") {
    return {
      title: "Permanently delete this file?",
      body: `“${file.label}” will be removed from all future emails. This can’t be undone from the console.`,
    };
  }
  if (file.kind === "agreement") {
    return {
      title: "Send the welcome email without the agreement?",
      body: "The signed agreement stays on the practitioner’s record — it just won’t be attached to this email.",
    };
  }
  return {
    title: "Remove this file from this email?",
    body: `“${file.label}” stays saved and can be attached again.`,
  };
}

const ICON_BTN =
  "flex size-11 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:size-[26px]";

const Svg = ({ children, size = 14 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
    {children}
  </svg>
);

/** The "Attachments" button on the hint line, with the attached count. */
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
      className={`flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:min-h-7 ${
        open ? "bg-gold-light text-gold-dark" : "text-ink-muted hover:bg-gold-light hover:text-gold-dark"
      }`}
    >
      <Svg size={13}>
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </Svg>
      Attachments
      <span
        // Keyed on the count so the bump replays when it changes.
        key={count}
        className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold text-2xs font-bold text-ink animate-attach-bump"
      >
        {count}
      </span>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftAttachment | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [removing, setRemoving] = useState<string | null>(null);

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

  // Escape closes the preview or the confirmation, not the whole dialog.
  // Captured on window so it runs before the dialog's own document listener.
  const layered = Boolean(confirm || preview);
  useEffect(() => {
    if (!layered) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      if (confirm) setConfirm(null);
      else setPreview(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [layered, confirm]);

  const attached = files.filter((f) => attachedIds.includes(f.id));
  const saved = files.filter((f) => f.kind === "library" && !attachedIds.includes(f.id));

  async function upload(list: FileList | File[]) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const added: { id: string; name: string }[] = [];
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
        added.push({ id: result.id, name: file.name });
      }
      if (added.length) {
        onFilesChange(await refresh());
        onAttachedChange([...attachedIds, ...added.map((a) => a.id)]);
        setNotice(
          added.length === 1
            ? `“${added[0].name}” added — saved for every future send.`
            : `${added.length} files added — saved for every future send.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmed() {
    if (!confirm) return;
    const { file, mode } = confirm;
    setError(null);
    setNotice(null);
    setBusy(true);
    setConfirm(null);
    try {
      // Fade the row out before it goes, as the V8 does.
      setRemoving(file.id);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      if (mode === "delete") {
        await deleteEmailAttachment(file.id);
        onFilesChange(await refresh());
      }
      onAttachedChange(attachedIds.filter((id) => id !== file.id));
      if (preview?.id === file.id) setPreview(null);
      setNotice(removedNotice(confirm));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete that file.");
    } finally {
      setRemoving(null);
      setBusy(false);
    }
  }

  const askRemove = (file: DraftAttachment) =>
    setConfirm({ file, mode: file.kind === "library" && file.canDelete ? "delete" : "detach" });

  return (
    <div
      ref={wrapRef}
      id="draft-attachments"
      className="mt-3 rounded-[10px] border border-border bg-surface-soft p-3 animate-fade-up"
    >
      <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-ink-faint">Attachments</p>

      {attached.map((file) => (
        <div
          key={file.id}
          className={`mb-[7px] flex items-center gap-[9px] rounded-lg border border-border bg-surface px-[9px] py-2 transition-[opacity,transform,border-color] duration-[180ms] hover:border-border-strong ${
            removing === file.id ? "translate-x-2 scale-[0.98] opacity-0" : ""
          }`}
        >
          <div
            className={`flex size-[30px] shrink-0 items-center justify-center rounded-[7px] ${
              file.kind === "agreement" ? "bg-green-light text-green" : "bg-gold-light text-gold-dark"
            }`}
          >
            {file.kind === "agreement" ? (
              <Svg>
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </Svg>
            ) : (
              <Svg>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </Svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-ink">{file.label}</div>
            <div className="text-2xs text-ink-faint">{noteFor(file)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-px">
            {file.kind === "agreement" ? (
              <span className="mr-1 rounded-full border border-border bg-surface-soft px-[7px] py-0.5 text-2xs font-semibold text-ink-faint">
                Auto
              </span>
            ) : null}
            <button type="button" onClick={() => setPreview(file)} aria-label={`Preview ${file.label}`} className={ICON_BTN}>
              <Svg>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </Svg>
            </button>
            <button
              type="button"
              onClick={() => askRemove(file)}
              aria-label={`Remove ${file.label}`}
              className={`${ICON_BTN} hover:!bg-red-light hover:!text-red`}
            >
              <Svg>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </Svg>
            </button>
          </div>
        </div>
      ))}

      {saved.length ? (
        <div className="mb-[7px]">
          <p className="mb-1 text-2xs text-ink-faint">Saved files — tap to attach</p>
          <ul className="flex flex-wrap gap-1.5">
            {saved.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => onAttachedChange([...attachedIds, file.id])}
                  className="min-h-11 rounded-full border border-border-strong bg-surface px-3 text-xs text-ink transition-colors hover:border-gold hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold pointer-fine:min-h-8"
                >
                  + {file.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-[5px] rounded-lg border-[1.5px] border-dashed px-2.5 py-4 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          dragging ? "border-gold bg-gold-light text-gold-dark" : "border-border-strong bg-surface text-ink-faint"
        }`}
      >
        <svg
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden
          className={`transition-transform ${dragging ? "-translate-y-0.5" : ""}`}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className={`text-xs font-semibold ${dragging ? "text-gold-dark" : "text-ink-muted"}`}>
          {busy ? "Working…" : "Drag a file here, or click to add"}
        </div>
        <div className="text-2xs">Saved for reuse on every future send · PDF, PNG or JPG, up to 2 MB</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="application/pdf,image/png,image/jpeg"
        onChange={(event) => {
          if (event.target.files?.length) void upload(event.target.files);
          event.target.value = "";
        }}
      />
      <p className="mt-1.5 text-2xs text-ink-faint">About 4 MB in total goes in one email.</p>

      <p aria-live="polite" className="mt-1 text-xs text-green empty:hidden">
        {notice}
      </p>
      <p role={error ? "alert" : undefined} className="mt-1 text-xs text-red empty:hidden">
        {error}
      </p>

      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${preview.label}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            event.currentTarget.querySelector("button")?.focus();
          }}
          className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-scrim p-4"
        >
          {preview.contentType === "application/pdf" ? (
            <iframe
              src={preview.previewUrl}
              title={`Preview of ${preview.label}`}
              className="h-[86dvh] w-[min(880px,92vw)] rounded-[10px] bg-surface shadow-xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- an authenticated, private, one-off preview; next/image would proxy it through the optimiser
            <img
              src={preview.previewUrl}
              alt={preview.label}
              className="max-h-[86dvh] max-w-[92vw] rounded-[10px] bg-surface object-contain shadow-xl"
            />
          )}
          <button
            type="button"
            autoFocus
            onClick={() => setPreview(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:right-7 sm:top-5 pointer-fine:size-[34px]"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-scrim p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="attach-confirm-title"
            className="w-full max-w-[360px] rounded-[10px] bg-surface p-5 shadow-xl animate-fade-up"
          >
            <h3 id="attach-confirm-title" className="text-base font-semibold text-ink">
              {confirmCopy(confirm).title}
            </h3>
            <p className="mt-2 text-sm leading-[1.6] text-ink-muted">{confirmCopy(confirm).body}</p>
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
