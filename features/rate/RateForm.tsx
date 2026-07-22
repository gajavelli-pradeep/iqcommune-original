"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { KeyValueGrid } from "@/components/ui/KeyValueGrid";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import { formatDateTimeIST } from "@/utils/format";

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
  const { submit, busy, error: submitError } = useApiSubmit(token);

  if (submitted) {
    return (
      <SuccessPanel
        as="h2"
        title="Thank you for your feedback"
        lede="We've recorded your rating — it genuinely helps us keep quality high across the network."
      >
        <KeyValueGrid
          rows={[
            { label: "Practitioner", value: session.practitioner },
            { label: "Session", value: session.reference },
            { label: "Your rating", value: `${rating} — ${RATING_LABELS[rating!]}`, emphasis: true },
            { label: "Submitted at", value: formatDateTimeIST(submitted.at) },
          ]}
        />
        <p className="mt-4 text-sm text-ink-faint">
          If you&apos;d like to share more, just reply to the email this link was sent from.
        </p>
      </SuccessPanel>
    );
  }

  return (
    <>
      <SessionDetailsCard session={session} />

      <form
        className="mt-6 rounded-[12px] border border-border bg-surface px-9 py-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (rating === null) return;
          const receipt = await submit("/api/ratings", { rating, comments });
          if (receipt) setSubmitted(receipt);
        }}
      >
        <StarRating value={rating} onChange={setRating} />

        <div className="mt-5">
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

        <FormError message={submitError} />

        <Button type="submit" variant="submit" busy={busy} busyLabel="Submitting…" disabled={rating === null}>
          Submit rating
        </Button>
      </form>
    </>
  );
}
