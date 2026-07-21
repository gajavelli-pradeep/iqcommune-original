"use client";

import { useState } from "react";

import { TextareaField } from "@/components/ui/Field";

import { RATING_LABELS, StarRating } from "./StarRating";
import { SessionDetailsCard, type RatedSession } from "./SessionDetailsCard";

/**
 * The rating flow: score, optional comment, receipt.
 *
 * Submit stays disabled until a star is chosen, matching the spec — but it is
 * disabled rather than silently inert, so the reason is visible.
 */

export function RateForm({ session }: { session: RatedSession }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState<{ at: string } | null>(null);

  if (submitted) {
    const rows: ReadonlyArray<[string, string]> = [
      ["Practitioner", session.practitioner],
      ["Session", session.reference],
      ["Your rating", `${rating} — ${RATING_LABELS[rating!]}`],
      ["Submitted at", submitted.at],
    ];
    return (
      <section className="rounded-lg border border-border bg-surface p-6 text-center">
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
        <h2 className="mb-1 text-2xl font-semibold text-ink">Thank you for your feedback</h2>
        <p className="mb-5 text-base leading-[1.6] text-ink-muted">
          We&apos;ve recorded your rating — it genuinely helps us keep quality high across the
          network.
        </p>
        <dl className="rounded-lg border border-border bg-surface-soft px-4 py-3 text-left">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
            >
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd
                className={`text-right text-base font-medium ${label === "Your rating" ? "text-green" : "text-ink"}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-faint">
          If you&apos;d like to share more, just reply to the email this link was sent from.
        </p>
      </section>
    );
  }

  return (
    <>
      <SessionDetailsCard session={session} />

      <form
        className="mt-4 rounded-lg border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (rating === null) return;
          setSubmitted({
            at: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          });
        }}
      >
        <StarRating value={rating} onChange={setRating} />

        <div className="mt-6">
          <TextareaField
            label="Anything you'd like to add?"
            optional
            rows={4}
            placeholder="Any specific feedback about the session or the practitioner..."
            value={comments}
            onChange={setComments}
            hint="This is shared internally with iqcommune only — not with the practitioner directly."
          />
        </div>

        <button
          type="submit"
          disabled={rating === null}
          className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit rating
        </button>
        {rating === null ? (
          <p className="mt-2 text-center text-sm text-ink-faint">Choose a rating to continue.</p>
        ) : null}
      </form>
    </>
  );
}
