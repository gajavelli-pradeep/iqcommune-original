"use client";

import { useRef, useState } from "react";

import { Callout } from "@/components/ui/Callout";
import { CheckboxField } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Stepper";
import { useFocusWhen } from "@/hooks/useFocusWhen";
import { formatDateIST, formatDateTimeIST } from "@/utils/format";
import type { PhotoSession } from "@/types/link-pages";
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

// Shape lives in types/, out of the client graph (audit H6); re-exported here.
export type { PhotoSession };

const STEPS = [
  "Link received ahead of session",
  "Capture & submit during/after session",
  "Reviewed & published",
] as const;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-caps text-ink-faint">{label}</dt>
      <dd className="text-base font-medium text-ink">{value}</dd>
    </div>
  );
}

export function PhotoSubmissionForm({
  session,
  token,
}: {
  session: PhotoSession;
  token: string;
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<{ photos?: string; consent?: string }>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  // The server computes the 30-day expiry and returns it (audit M23); the UI
  // shows that, not a value recomputed from the browser clock.
  const [expiryDate, setExpiryDate] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const successRef = useFocusWhen<HTMLHeadingElement>(Boolean(submittedAt));

  if (submittedAt) {
    const rows: ReadonlyArray<[string, string]> = [
      ["Submitted by", session.practitioner],
      ["Practitioner ref.", session.practitionerRef],
      ["Session", session.sessionId],
      ["Submitted at", submittedAt],
      ["Storage expiry", expiryDate],
      ["Status", "✓ Received — pending review"],
    ];
    return (
      <section role="status" className="rounded-lg border border-border bg-surface px-8 py-12 text-center">
        <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-green-light text-green">
          <svg
            width="34"
            height="34"
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
        <h1 ref={successRef} tabIndex={-1} className="mb-1 text-2xl font-semibold text-ink outline-none">
          Photos received. Thank you.
        </h1>
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
    <section className="rounded-lg border border-border bg-surface p-8">
      <Stepper steps={STEPS} current={1} />

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
        <p className="mt-2">
          <span className="inline-flex rounded-full border border-gold-border bg-gold-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-gold-dark">
            Ref: {session.practitionerRef}
          </span>
        </p>
      </div>

      <dl className="mb-5 grid gap-4 rounded-lg border border-border bg-surface-soft px-4 py-[0.85rem] min-[480px]:grid-cols-2 min-[600px]:grid-cols-4">
        <Detail label="Session date" value={session.sessionDate} />
        <Detail label="Module" value={session.module} />
        <Detail label="City" value={`${session.city}, ${session.state}`} />
        <Detail label="Session ID" value={session.sessionId} />
      </dl>

      <div className="mb-6">
        <Callout>
          <strong className="font-semibold">Storage policy:</strong> All photos are stored securely
          for 30 days from the date of submission. Anything not approved for publication within that
          window is automatically deleted — we do not retain unprocessed photos beyond 30 days. No
          action needed from you after submission.
        </Callout>
      </div>

      <form
        noValidate
        onSubmit={async (event) => {
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
          setBusy(true);
          setSubmitError(undefined);
          try {
            const body = new FormData();
            body.append("t", token);
            for (const photo of photos) body.append("photos", photo);

            const response = await fetch("/api/photo-submissions", { method: "POST", body });
            const result = await response.json();
            if (!response.ok) {
              setSubmitError(result?.error?.message ?? "Something went wrong. Please try again.");
              return;
            }
            setExpiryDate(formatDateIST(result.data.expiryDate));
            setSubmittedAt(formatDateTimeIST(result.data.submittedAt));
          } catch {
            setSubmitError("We could not reach the server. Check your connection and try again.");
          } finally {
            setBusy(false);
          }
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

        {submitError ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-full bg-ink px-5 py-4 text-lg font-semibold text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {busy ? "Submitting…" : "Submit photos for review"}
        </button>
        <p className="mt-3 text-center text-sm leading-[1.5] text-ink-faint">
          Nothing is published automatically. Every photo is reviewed by iqcommune before appearing
          anywhere.
        </p>
      </form>
    </section>
  );
}
