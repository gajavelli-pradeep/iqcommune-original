"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";

import { controlClass } from "@/components/ui/control";

import {
  moveGalleryPhoto,
  publishGalleryDrafts,
  removeGalleryPhoto,
  unpublishGalleryPhoto,
  updateGalleryPhoto,
} from "../actions";
import { can, type ConsoleRole } from "../roles";
import { GALLERY_LIMIT } from "@/constants/gallery";
import type { GalleryRow } from "@/services/console";

/**
 * Gallery — what appears in "Sessions in the room" on the landing page.
 *
 * Two stages, as V7 has it: photos land in a draft area, get a city and a
 * caption there, and only then go live. The staging is the point — this is the
 * one console tab whose output is a public page, so nothing reaches it by
 * accident.
 *
 * The live grid marks which photo is next to be evicted, because publishing
 * past twenty silently removes the oldest and an admin should see that coming
 * rather than discover it afterwards.
 */

const PILL = "rounded-full bg-surface-soft px-3 py-[5px] text-xs font-semibold text-ink";
const FIELD = controlClass({ tone: "compact", size: "xs" });

/** The small dark ✕ that sits on a photo tile. */
function RemovePhoto({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={() => start(async () => { await removeGalleryPhoto(id); })}
      className="absolute right-[5px] top-[5px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink/75 text-xs text-surface transition-opacity hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']"
    >
      <span aria-hidden>✕</span>
    </button>
  );
}

/**
 * The controls on a live tile: where it sits in the carousel, and the way off
 * the landing page that is not deletion.
 *
 * Drawn as a strip under the photo rather than floating on it: three 44px
 * targets do not fit across a tile this size without overlapping, the caption
 * wash stays readable, and the destructive control keeps its distance from the
 * two that are not.
 */
function LiveControls({
  id,
  label,
  isFirst,
  isLast,
  onError,
}: {
  id: string;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onError: (message: string) => void;
}) {
  const [pending, start] = useTransition();

  const move = (direction: "up" | "down") =>
    start(async () => {
      const result = await moveGalleryPhoto(id, direction);
      if (!result.ok) onError(result.message);
    });

  const button =
    "flex h-11 min-w-11 flex-1 items-center justify-center text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex items-stretch border-t border-border">
      <button
        type="button"
        aria-label={`Move ${label} earlier`}
        disabled={isFirst || pending}
        onClick={() => move("up")}
        className={button}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Move ${label} later`}
        disabled={isLast || pending}
        onClick={() => move("down")}
        className={`${button} border-x border-border`}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Unpublish ${label}`}
        title="Back to draft — keeps the photo, its caption and the file"
        disabled={pending}
        onClick={() => start(async () => { await unpublishGalleryPhoto(id); })}
        className={`${button} flex-[2] text-3xs font-semibold uppercase tracking-caps`}
      >
        {pending ? "…" : "Unpublish"}
      </button>
    </div>
  );
}

/** One draft tile: the photo, and the two fields it needs before publishing. */
function DraftPhoto({ photo }: { photo: GalleryRow }) {
  const [city, setCity] = useState(photo.city ?? "");
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [pending, start] = useTransition();

  // Saved on blur rather than per keystroke: a write per character would be a
  // request per character.
  const save = (fields: { city?: string; caption?: string }) =>
    start(async () => { await updateGalleryPhoto(photo.id, fields); });

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong">
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" className="block h-full w-full object-cover" />
        <RemovePhoto id={photo.id} label="Remove this draft photo" />
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        <label className="sr-only" htmlFor={`${photo.id}-city`}>
          City
        </label>
        <input
          id={`${photo.id}-city`}
          value={city}
          disabled={pending}
          placeholder="City"
          onChange={(event) => setCity(event.target.value)}
          onBlur={() => city.trim() !== (photo.city ?? "") && save({ city })}
          className={FIELD}
        />
        <label className="sr-only" htmlFor={`${photo.id}-caption`}>
          Caption
        </label>
        <input
          id={`${photo.id}-caption`}
          value={caption}
          disabled={pending}
          placeholder="Caption (e.g. 'Group discussion, Q&A round')"
          onChange={(event) => setCaption(event.target.value)}
          onBlur={() => caption.trim() !== (photo.caption ?? "") && save({ caption })}
          className={FIELD}
        />
      </div>
    </div>
  );
}

export function GalleryPanel({ rows, role }: { rows: readonly GalleryRow[]; role: ConsoleRole }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mayEdit = can(role, "mutate");
  const drafts = rows.filter((row) => row.status === "Draft");
  const live = rows.filter((row) => row.status === "Published");

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const body = new FormData();
    for (const file of Array.from(files)) body.append("photos", file);

    start(async () => {
      setError(null);
      const response = await fetch("/api/gallery/upload", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "The upload failed." }));
        setError(payload.error ?? "The upload failed.");
        return;
      }
      window.location.reload();
    });
  };

  const publish = () =>
    start(async () => {
      setError(null);
      const result = await publishGalleryDrafts();
      if (!result.ok) setError(result.message);
    });

  return (
    <>
      {/* ── Draft ───────────────────────────────────────────────────────── */}
      {mayEdit ? (
        <section className="mb-6 rounded-[10px] border border-border-strong bg-surface p-5">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">Draft photos — add city and a caption, then publish</p>
            <span className={PILL}>{drafts.length} in draft</span>
          </div>

          <label
            onDragOver={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              setDragging(false);
              upload(event.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center rounded-[10px] border-2 border-dashed px-6 py-6 text-center transition-colors ${
              dragging ? "border-gold bg-gold-light/40" : "border-border-strong hover:border-gold"
            }`}
          >
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden className="mb-1.5 text-ink-faint">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm font-medium text-ink">Drag photos here, or click to browse</span>
            <span className="mt-[3px] text-xs text-ink-faint">JPG or PNG — multiple files at once</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              onChange={(event) => {
                upload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

          {drafts.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {drafts.map((photo) => (
                <DraftPhoto key={photo.id} photo={photo} />
              ))}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-ink-faint">
              {drafts.length === 0
                ? "Nothing in draft yet"
                : `${drafts.length} photo${drafts.length === 1 ? "" : "s"} ready — not live until published`}
            </span>
            <button
              type="button"
              disabled={drafts.length === 0 || pending}
              onClick={publish}
              className="inline-flex items-center gap-[7px] rounded-lg bg-ink px-3.5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              {pending ? "Publishing…" : "Publish — adds to live gallery"}
            </button>
          </div>
        </section>
      ) : null}

      {/* ── Live ────────────────────────────────────────────────────────── */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Currently live on the landing page</h2>
        <span className={PILL}>
          {live.length} / {GALLERY_LIMIT}
        </span>
      </div>

      {live.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" aria-hidden className="mx-auto text-ink-faint">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="mt-2 text-base font-medium text-ink">Nothing published yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Curate a few photos above and click Publish to populate the landing page gallery.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {live.map((photo, index) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-lg border border-border-strong"
            >
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ""} className="block h-full w-full object-cover" />

                {/* Publishing past the limit drops the oldest, so say which. */}
                {index === 0 && live.length >= GALLERY_LIMIT ? (
                  <span className="absolute inset-x-0 top-0 bg-ink/70 py-0.5 text-center text-3xs text-surface">
                    oldest — next to go
                  </span>
                ) : null}

                {/* Position, so the panel's order is legible as the carousel's. */}
                <span className="absolute left-[5px] bottom-[5px] rounded-full bg-ink/75 px-1.5 py-px text-3xs font-semibold text-surface">
                  {index + 1}
                </span>

                {/* V7's caption wash. Written as a style rather than gradient
                    utilities so the colour comes from a token — the token guard
                    reads `bg-*` as a colour reference, and `from-black` is not
                    one. */}
                <span
                  style={{
                    backgroundImage:
                      "linear-gradient(transparent, var(--color-photo-caption-scrim))",
                  }}
                  className="absolute inset-x-0 bottom-0 px-1.5 pb-1 pl-7 pt-3 text-3xs text-surface"
                >
                  {photo.caption ? <span className="block font-medium">{photo.caption}</span> : null}
                  {photo.city ? <span className="block opacity-85">{photo.city}</span> : null}
                </span>

                {mayEdit ? (
                  <RemovePhoto
                    id={photo.id}
                    label={`Delete ${photo.caption ?? "this photo"} permanently`}
                  />
                ) : null}
              </div>

              {/* Controls sit under the photo, not on it: three 44px targets do
                  not fit across a tile this size without overlapping, and one
                  of them deletes. */}
              {mayEdit ? (
                <LiveControls
                  id={photo.id}
                  label={photo.caption ?? "this photo"}
                  isFirst={index === 0}
                  isLast={index === live.length - 1}
                  onError={setError}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
