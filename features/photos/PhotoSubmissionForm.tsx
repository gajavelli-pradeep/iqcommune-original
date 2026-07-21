"use client";

import { useRef, useState } from "react";

import { CheckboxField } from "@/components/ui/Field";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTOS,
  validatePhotos,
} from "@/lib/schemas/photo-submission";

import { ShotChecklist } from "./ShotChecklist";

/**
 * P5 — the standalone photo submission page, opened from a tokenised link.
 *
 * Unlike P1's modal, the practitioner and session are already known: they come
 * from the row the token names, and are shown rather than asked for. The only
 * inputs are the photos and the consent that permits publishing them.
 */

export interface PhotoSession {
  practitioner: string;
  practitionerRole: string;
  practitionerRef: string;
  sessionDate: string;
  module: string;
  city: string;
  state: string;
  sessionId: string;
}

const STEPS = [
  "Link received ahead of session",
  "Capture & submit during/after session",
  "Reviewed & published",
] as const;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-sm ${
              index <= current ? "font-medium text-gold-dark" : "text-ink-faint"
            }`}
          >
            {index < current ? (
              <span aria-hidden>✓</span>
            ) : (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
            {step}
          </span>
          {index < STEPS.length - 1 ? (
            <span aria-hidden className="text-ink-faint">
              ›
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-caps text-ink-faint">{label}</dt>
      <dd className="text-base font-medium text-ink">{value}</dd>
    </div>
  );
}

export function PhotoSubmissionForm({ session }: { session: PhotoSession }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<{ photos?: string; consent?: string }>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (submittedAt) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const rows: ReadonlyArray<[string, string]> = [
      ["Submitted by", session.practitioner],
      ["Practitioner ref.", session.practitionerRef],
      ["Session", session.sessionId],
      ["Submitted at", submittedAt],
      ["Storage expiry", expiry.toLocaleDateString("en-IN", { dateStyle: "medium" })],
      ["Status", "✓ Received — pending review"],
    ];
    return (
      <section className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
            focusable="false"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-1 text-2xl font-semibold text-ink">Photos received. Thank you.</h1>
        <p className="mb-5 text-base leading-[1.6] text-ink-muted">
          We&apos;ll review and process them within 30 days. Confirmed photos will appear on the
          iqcommune sessions gallery. If you included an organisation name, we&apos;ll confirm with
          you before any public tagging.
        </p>
        <dl className="rounded-lg border border-border bg-surface-soft px-4 py-3 text-left">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
            >
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="text-right text-base font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-[1.5] text-ink-faint">
          Photos are stored for 30 days from the submission timestamp above. Unprocessed photos are
          deleted automatically at expiry — no action needed from you.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <Stepper current={1} />

      <h1 className="mb-1 text-3xl font-semibold text-ink">Your session photo link</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        Bookmark or save this page — come back to it during your session or right after to submit
        your photos. Eight standard angles, all on your phone. Once submitted, your photos sit in
        our review queue; we&apos;ll process and publish the confirmed ones, and anything not
        selected is automatically deleted after 30 days.
      </p>

      <div className="mb-4 rounded-lg border border-border bg-surface-soft px-5 py-4">
        <p className="text-md font-semibold text-ink">{session.practitioner}</p>
        <p className="text-sm text-ink-muted">{session.practitionerRole}</p>
        <p className="mt-1 text-sm text-ink-faint">Ref: {session.practitionerRef}</p>
      </div>

      <dl className="mb-5 grid gap-4 min-[480px]:grid-cols-2">
        <Detail label="Session date" value={session.sessionDate} />
        <Detail label="Module" value={session.module} />
        <Detail label="City" value={`${session.city}, ${session.state}`} />
        <Detail label="Session ID" value={session.sessionId} />
      </dl>

      <p className="mb-6 rounded-r-lg border-l-[3px] border-l-gold bg-gold-light px-4 py-[0.85rem] text-sm leading-[1.6] text-gold-dark">
        <strong className="font-semibold">Storage policy:</strong> All photos are stored securely
        for 30 days from the date of submission. Anything not approved for publication within that
        window is automatically deleted — we do not retain unprocessed photos beyond 30 days. No
        action needed from you after submission.
      </p>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const photoProblem = validatePhotos(photos);
          const next = {
            photos: photoProblem,
            consent: consented ? undefined : "Participant consent is required before submitting",
          };
          if (next.photos || next.consent) {
            setErrors(next);
            return;
          }
          setErrors({});
          setSubmittedAt(
            new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          );
        }}
      >
        <ShotChecklist />

        <div className="mb-5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`min-h-11 w-full rounded-lg border-[1.5px] border-dashed px-4 py-8 text-center text-base transition-colors hover:border-gold ${
              errors.photos ? "border-red text-red" : "border-border-strong text-ink-muted"
            }`}
          >
            {photos.length > 0
              ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected`
              : "Tap to upload photos"}
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPTED_PHOTO_TYPES.join(",")}
            aria-label="Choose session photos"
            className="sr-only"
            onChange={(event) => {
              setPhotos([...(event.target.files ?? [])].slice(0, MAX_PHOTOS));
              setErrors((current) => ({ ...current, photos: undefined }));
            }}
          />
          <p className="mt-1.5 text-center text-sm text-ink-faint">
            JPEG or PNG · Up to {MAX_PHOTOS} photos · Max 25MB per photo
          </p>
          {errors.photos ? (
            <p role="alert" className="mt-1 text-center text-sm text-red">
              {errors.photos}
            </p>
          ) : null}
        </div>

        <CheckboxField checked={consented} onChange={setConsented} error={errors.consent}>
          All session participants were informed that photos would be taken and may appear on
          iqcommune&apos;s website and social media. I confirm participant consent on their behalf,
          and take responsibility for any tagging or attribution requests related to these photos.
        </CheckboxField>

        <button
          type="submit"
          className="min-h-11 w-full rounded-full bg-ink px-5 py-4 text-lg font-semibold text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Submit photos for review
        </button>
        <p className="mt-3 text-center text-sm leading-[1.5] text-ink-faint">
          Nothing is published automatically. Every photo is reviewed by iqcommune before appearing
          anywhere.
        </p>
      </form>
    </section>
  );
}
