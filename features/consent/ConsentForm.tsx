"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/ui/Field";

import { SessionSummary, type ConsentSession } from "./SessionSummary";

/** The three declarations, the single confirming tick, and the receipt. */

const DECLARATIONS = [
  "I have reviewed all session details and the confirmed payout amount above and confirm they are correct.",
  "I agree to deliver the session as described and accept the payout amount stated.",
  "I understand this confirmation is specific to this session only and does not alter my empanelment agreement.",
] as const;

export function ConsentForm({ session }: { session: ConsentSession }) {
  const [confirmed, setConfirmed] = useState(false);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);

  if (recordedAt) {
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
        <h1 className="mb-1 text-2xl font-semibold text-ink">Consent recorded</h1>
        <p className="text-base leading-[1.6] text-ink-muted">
          Thank you — your session is now fully confirmed. iqcommune has been notified.
        </p>
        <p className="mt-4 text-sm text-ink-faint">Digital consent timestamp: {recordedAt}</p>
      </section>
    );
  }

  return (
    <>
      <SessionSummary session={session} />

      <form
        className="mt-4 rounded-lg border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!confirmed) return;
          setRecordedAt(
            new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          );
        }}
      >
        <div className="mb-5 rounded-lg border border-border bg-surface-soft px-5 py-4">
          <h2 className="mb-3 text-md font-semibold text-ink">
            Your consent is required to confirm this session
          </h2>
          <ul>
            {DECLARATIONS.map((declaration) => (
              <li
                key={declaration}
                className="mb-2.5 flex items-start gap-2.5 text-base leading-[1.55] text-ink-muted last:mb-0"
              >
                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {declaration}
              </li>
            ))}
          </ul>
        </div>

        <CheckboxField checked={confirmed} onChange={setConfirmed}>
          I confirm the above and provide my digital consent to this session.
        </CheckboxField>

        <button
          type="submit"
          disabled={!confirmed}
          className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Provide consent
        </button>
      </form>
    </>
  );
}
