"use client";

import { useEffect, useState, useTransition, type DragEvent } from "react";

import { Modal } from "@/components/ui/Modal";
import { MAX_PHOTOS } from "@/lib/schemas/photo-submission";
import type { PhotoRow } from "@/services/console";

/**
 * The Photos tab's two dialogs (V7 `openUploadModal` / `openPhotoModal`).
 *
 * Neither is a plain file input. Upload is a drop zone with a removable file
 * list and a confirm that stays disabled until something is chosen; download is
 * a thumbnail grid you select from, because a session carries up to eight
 * photos and "download" almost never means all of them.
 *
 * Both are built on the shared `Modal`, which already owns the parts a
 * hand-rolled dialog gets wrong: Escape, the focus trap, and releasing the
 * body-scroll lock on every close path.
 */

// V7 `.btn-xs` — 11px in a 100px-radius pill, the footer rail's size.
const XS = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45";
const XS_GHOST = `${XS} border border-border-strong bg-surface text-ink-muted hover:bg-surface-soft hover:text-ink`;
const XS_DARK = `${XS} bg-ink text-surface hover:opacity-90`;

// ── Upload ──────────────────────────────────────────────────────────────────

export function UploadPhotosModal({
  row,
  open,
  onClose,
}: {
  row: PhotoRow;
  open: boolean;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);
    setFiles((current) => [...current, ...Array.from(incoming)].slice(0, MAX_PHOTOS));
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  };

  const send = () =>
    start(async () => {
      setError(null);
      const body = new FormData();
      body.set("sessionId", row.id);
      // The practitioner obtained consent in the room; the admin is the courier.
      body.set("participantConsent", "true");
      for (const file of files) body.append("photos", file);

      const response = await fetch("/api/photo-submissions/upload", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "The upload failed." }));
        setError(payload.error ?? "The upload failed.");
        return;
      }
      // The row's count and expiry come from the server read, so refetch.
      window.location.reload();
    });

  const footer = (
    <>
      <span className="text-xs text-ink-muted">
        {files.length === 0 ? "No files chosen" : `${files.length} file${files.length > 1 ? "s" : ""} ready`}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className={XS_GHOST}>
          Cancel
        </button>
        <button type="button" disabled={files.length === 0 || pending} onClick={send} className={XS_DARK}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="console"
      footer={footer}
      title={`Upload photos — ${row.sessionReference}`}
      description={`Photos ${row.practitioner} sent you for this session`}
    >
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-gold bg-gold-light/40" : "border-border-strong hover:border-gold"
        }`}
      >
        <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden className="text-ink-faint">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="mt-2 text-sm font-medium text-ink">Drag files here, or click to browse</span>
        <span className="mt-[3px] text-xs text-ink-faint">
          JPG or PNG — up to {MAX_PHOTOS} at once
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {files.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-md bg-surface-soft px-2.5 py-1.5 text-xs text-ink-muted"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((current) => current.filter((_, at) => at !== index))}
                className="shrink-0 rounded px-1 text-sm text-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

// ── Download ────────────────────────────────────────────────────────────────

interface SignedPhoto {
  name: string;
  url: string;
}

export function DownloadPhotosModal({
  row,
  open,
  onClose,
}: {
  row: PhotoRow;
  open: boolean;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<SignedPhoto[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  /**
   * Signed URLs are short-lived, so they are fetched when the dialog opens
   * rather than held on the page going stale.
   *
   * In an effect, not during render: a fetch kicked off from the render path
   * fires again on every re-render and React has no way to cancel it. The
   * `cancelled` flag covers the case where the dialog is closed mid-flight,
   * which would otherwise set state on a dialog nobody is looking at.
   */
  useEffect(() => {
    if (!open || !row.submissionId) return;
    let cancelled = false;

    (async () => {
      const response = await fetch(`/api/photo-submissions/${row.submissionId}/download`);
      const payload = await response.json().catch(() => null);
      if (cancelled) return;

      if (!response.ok || !payload?.photos) {
        setError(payload?.error ?? "Those photos could not be opened.");
        return;
      }
      setPhotos(payload.photos);
      setSelected(new Set(payload.photos.map((_: SignedPhoto, index: number) => index)));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row.submissionId]);

  const close = () => {
    setPhotos(null);
    setSelected(new Set());
    setError(null);
    onClose();
  };

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const allSelected = photos !== null && selected.size === photos.length && photos.length > 0;

  /**
   * Saves each chosen photo. Staggered because browsers throttle several
   * programmatic downloads fired in the same tick — unstaggered, all but the
   * first are silently dropped, which looks like the button half-working.
   */
  const downloadSelected = () => {
    if (!photos) return;
    [...selected].forEach((index, at) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = photos[index].url;
        link.download = `${row.sessionReference}-photo-${index + 1}`;
        link.rel = "noopener";
        document.body.append(link);
        link.click();
        link.remove();
      }, at * 400);
    });
  };

  const footer = (
    <>
      {/* V7 puts the count on the left and the two actions on the right. */}
      <span className="text-xs text-ink-muted">{selected.size} selected</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!photos?.length}
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set((photos ?? []).map((_, index) => index)))
          }
          className={XS_GHOST}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={downloadSelected}
          className={XS_DARK}
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download selected
        </button>
      </div>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      variant="console"
      maxWidth="680px"
      footer={footer}
      title={`${row.sessionReference} — ${row.module}`}
      description={`${row.photoCount} photos submitted by ${row.practitioner} — select the ones you want to download`}
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
          {error}
        </p>
      ) : photos === null ? (
        <p className="py-6 text-center text-sm text-ink-faint">Preparing photos…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {photos.map((photo, index) => {
            const isSelected = selected.has(index);
            return (
              <li key={photo.url}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(index)}
                  aria-label={`Photo ${index + 1}`}
                  /* V7 `.photo-thumb`: square, 8px radius, 2px border that
                     turns gold with a glow when picked. */
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-surface-soft transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    isSelected
                      ? "border-gold shadow-[0_0_0_2px_var(--color-gold-glow)]"
                      : "border-transparent hover:border-border-strong"
                  }`}
                >
                  {/* The real photo, not V7's placeholder tile — the whole
                      point of choosing is seeing what you are choosing.
                      Deliberately a plain <img>: next/image would proxy and
                      cache these through the optimizer, and they are
                      short-lived signed URLs for private photos of
                      identifiable people. Caching them is exactly what the
                      signed URL exists to prevent. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {/* V7 `.thumb-check` — 18px, white until picked, then gold. */}
                  <span
                    aria-hidden
                    className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] text-2xs ${
                      isSelected
                        ? "border-gold bg-gold text-ink"
                        : "border-border-strong bg-surface text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
