"use client";

import { useId, useRef, useState } from "react";

import { CheckboxField, SelectField, TextField } from "@/components/ui/Field";
import { focusFirstError } from "@/components/ui/focus-first-error";
import { Modal } from "@/components/ui/Modal";
import { networkFailure, readFailure } from "@/lib/api/failure";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
  megabytes,
  photoSubmissionSchema,
  validatePhotos,
  type PhotoSubmissionInput,
} from "@/lib/schemas/photo-submission";

/**
 * Post-session photo submission — found by the F4 parity gate, absent from the
 * original P1 list.
 *
 * Uploads go through the server route rather than straight to storage: the
 * route is where type, size and count are actually enforced, and where the
 * consent that permits publishing these photos is recorded alongside them.
 */

const MODULES = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
] as const;

const SHOT_LIST = [
  "Back of room — trainer in focus, full audience visible",
  "From trainer's position — audience looking toward screen",
  "Front-left corner — wide view of the room",
  "Front-right corner — trainer and materials visible",
  "Candid — participant working through numbers",
  "Candid — Q&A or discussion moment",
  "Candid — close-up of notes, worksheets, or screen",
  "Group photo — trainer and all participants",
] as const;

const EMPTY: PhotoSubmissionInput = {
  submitterName: "",
  submitterEmail: "",
  organisationName: "",
  sessionDate: "",
  moduleTaught: "",
  participantConsent: false,
};

type Status = "editing" | "submitting" | "sent";

export function PostSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<PhotoSubmissionInput>(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // The picker is hand-built rather than a `Field`, so it wires its own error
  // message to the control the way `Field` does for everything else.
  const photosErrorId = useId();

  const set = <K extends keyof PhotoSubmissionInput>(key: K, value: PhotoSubmissionInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function close() {
    onClose();
    setTimeout(() => {
      setForm(EMPTY);
      setPhotos([]);
      setErrors({});
      setStatus("editing");
      setSubmitError(undefined);
    }, 200);
  }

  async function submit() {
    const parsed = photoSubmissionSchema.safeParse(form);
    const photoProblem = validatePhotos(photos);

    if (!parsed.success || photoProblem) {
      const next: Record<string, string> = {};
      if (!parsed.success) {
        for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      }
      if (photoProblem) next.photos = photoProblem;
      setErrors(next);
      focusFirstError(formRef.current);
      return;
    }

    setErrors({});
    setStatus("submitting");
    setSubmitError(undefined);

    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(parsed.data)) body.append(key, String(value));
      for (const photo of photos) body.append("photos", photo);

      const response = await fetch("/api/photo-submissions", { method: "POST", body });

      if (!response.ok) {
        // Read before assuming: a request refused upstream answers with HTML,
        // and parsing that used to land in the catch below as a connection
        // problem.
        const failure = await readFailure(
          response,
          `Those photos were too large to send in one go — one upload can carry ${megabytes(MAX_TOTAL_PHOTO_BYTES)}. Try fewer at a time.`,
        );
        if (failure.fields) setErrors(failure.fields);
        setSubmitError(failure.message);
        setStatus("editing");
        return;
      }

      await response.json();
      setStatus("sent");
    } catch {
      // Only a request that never got an answer reaches here now.
      setSubmitError(
        networkFailure(
          photos.reduce((total, photo) => total + photo.size, 0),
          MAX_TOTAL_PHOTO_BYTES,
        ),
      );
      setStatus("editing");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={status === "sent" ? "Photos received — thank you." : "Share your session photos"}
      description={
        status === "sent"
          ? undefined
          : "Photos from sessions are displayed on this page and used for iqcommune's social presence. Use the shot list below — a phone camera on good natural light is all you need."
      }
    >
      {status === "sent" ? (
        <p className="py-6 text-center text-lg text-ink-muted">
          We&apos;ll process and add them to the gallery within a few days. If you&apos;ve included an
          organisation name, we&apos;ll confirm with you before tagging publicly.
        </p>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h3 className="mb-3 text-md font-semibold text-ink">Session details</h3>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="Your name"
              value={form.submitterName}
              onChange={(value) => set("submitterName", value)}
              error={errors.submitterName}
            />
            <TextField
              type="email"
              label="Email address"
              value={form.submitterEmail}
              onChange={(value) => set("submitterEmail", value)}
              error={errors.submitterEmail}
            />
          </div>

          <TextField
            label="Organisation / group name"
            optional
            placeholder="e.g. HDFC Securities, Koramangala Study Circle"
            value={form.organisationName ?? ""}
            onChange={(value) => set("organisationName", value)}
            error={errors.organisationName}
            hint="(optional — for tagging)"
          />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              type="date"
              label="Date of session"
              value={form.sessionDate}
              onChange={(value) => set("sessionDate", value)}
              error={errors.sessionDate}
            />
            <SelectField
              label="Module taught"
              placeholder="Select module…"
              options={MODULES.map((module) => ({ value: module, label: module }))}
              value={form.moduleTaught}
              onChange={(value) => set("moduleTaught", value)}
              error={errors.moduleTaught}
            />
          </div>

          <h3 className="mb-2 mt-2 text-md font-semibold text-ink">
            Shot checklist — tick what you captured
          </h3>
          <ul className="mb-5 grid gap-1.5">
            {SHOT_LIST.map((shot) => (
              <li key={shot} className="flex items-start gap-2 text-sm leading-[1.5] text-ink-muted">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                  focusable="false"
                  className="mt-[3px] shrink-0 text-gold"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {shot}
              </li>
            ))}
          </ul>

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium text-ink">Upload photos</p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              /* The picker is the control that is wrong when no photo is chosen,
                 so it carries the invalid state — a red border alone is colour-
                 only (WCAG 1.4.1) and silent to a screen reader. `data-invalid`
                 rather than `aria-invalid` because this is a button, where that
                 attribute is unsupported; the description is what announces it.
                 It is also what makes this a field `focusFirstError` can land on. */
              data-invalid={errors.photos ? true : undefined}
              aria-describedby={errors.photos ? photosErrorId : undefined}
              className={`min-h-11 w-full rounded-lg border-[1.5px] border-dashed px-4 py-6 text-center text-base transition-colors hover:border-gold ${
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
                // Choosing files clears the previous complaint about them.
                setErrors((current) => {
                  const next = { ...current };
                  delete next.photos;
                  return next;
                });
              }}
            />
            <p className="mt-1 text-sm text-ink-faint">
              JPEG or PNG · Up to {MAX_PHOTOS} photos · Max 25MB per photo
              <span className="mt-0.5 block">
                Up to {megabytes(MAX_TOTAL_PHOTO_BYTES)} in one upload — send a second batch if you have more.
              </span>
            </p>
            {errors.photos ? (
              <p id={photosErrorId} role="alert" className="mt-1 text-sm text-red">
                {errors.photos}
              </p>
            ) : null}
          </div>

          <CheckboxField
            checked={form.participantConsent}
            onChange={(checked) => set("participantConsent", checked)}
            error={errors.participantConsent}
          >
            All participants were informed that photos would be taken and may be used on
            iqcommune&apos;s website and social media. I confirm this on their behalf.
          </CheckboxField>

          {submitError ? (
            <p
              role="alert"
              className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red"
            >
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Submitting…" : "Submit photos"}
          </button>
        </form>
      )}
    </Modal>
  );
}
