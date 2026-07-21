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

export function RateForm({ session, token }: { session: RatedSession; token: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState<{ at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  /** Posts to the route, which re-verifies the token before writing. */
  async function send(endpoint: string, payload: Record<string, unknown>) {
    setBusy(true);
    setSubmitError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, ...payload }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSubmitError(body?.error?.message ?? "Something went wrong. Please try again.");
        return null;
      }
      // The receipt timestamp comes back from the server, not from this clock.
      return body.data as { at: string };
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }


  if (submitted) {
    const rows: ReadonlyArray<[string, string]> = [
      ["Practitioner", session.practitioner],
      ["Session", session.reference],
      ["Your rating", `${rating} — ${RATING_LABELS[rating!]}`],
      ["Submitted at", new Date(submitted.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
    ];
    return (
      <section className="rounded-lg border border-border bg-surface p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-light text-green">
          <svg
            width="26"
            height="26"
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
        className="mt-4 rounded-lg border border-border bg-surface px-9 py-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (rating === null) return;
          const receipt = await send("/api/ratings", { rating, comments });
          if (receipt) setSubmitted(receipt);
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
          disabled={rating === null || busy}
          className="min-h-11 w-full rounded-md bg-ink px-5 py-3.5 text-lg font-medium text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit rating"}
        </button>
        {rating === null ? (
          <p className="mt-2 text-center text-sm text-ink-faint">Choose a rating to continue.</p>
        ) : null}
      </form>
    </>
  );
}
