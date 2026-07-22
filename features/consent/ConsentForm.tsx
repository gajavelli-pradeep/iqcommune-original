"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import { formatDateTimeIST } from "@/utils/format";

import { SessionSummary, type ConsentSession } from "./SessionSummary";

/** The three declarations, the single confirming tick, and the receipt. */

const DECLARATIONS = [
  "I have reviewed all session details and the confirmed payout amount above and confirm they are correct.",
  "I agree to deliver the session as described and accept the payout amount stated.",
  "I understand this confirmation is specific to this session only and does not alter my empanelment agreement.",
] as const;

export function ConsentForm({ session, token }: { session: ConsentSession; token: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);
  const { submit, busy, error: submitError } = useApiSubmit(token);

  if (recordedAt) {
    return (
      <SuccessPanel
        title="Consent recorded"
        lede="Thank you — your session is now fully confirmed. iqcommune has been notified."
      >
        <p className="mt-4 text-sm text-ink-faint">Digital consent timestamp: {recordedAt}</p>
      </SuccessPanel>
    );
  }

  return (
    <>
      <SessionSummary session={session} />

      <form
        className="mt-6 rounded-[12px] border border-border bg-surface px-9 py-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!confirmed) return;
          const receipt = await submit("/api/consents");
          if (receipt) setRecordedAt(formatDateTimeIST(receipt.at));
        }}
      >
        <div className="mb-5 rounded-md bg-surface-soft px-6 py-5">
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Your consent is required to confirm this session
          </h2>
          <ul>
            {DECLARATIONS.map((declaration) => (
              <li
                key={declaration}
                className="mb-2 flex items-start gap-2.5 text-base leading-[1.55] text-ink-muted last:mb-0"
              >
                {/* V7 .consent-item marker is a gold-dark check, not a dot. */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                  focusable="false"
                  className="mt-[3px] shrink-0 text-gold-dark"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {declaration}
              </li>
            ))}
          </ul>
        </div>

        <CheckboxField checked={confirmed} onChange={setConfirmed}>
          I confirm the above and provide my digital consent to this session.
        </CheckboxField>

        <FormError message={submitError} />

        <Button type="submit" variant="submit" busy={busy} busyLabel="Recording…" disabled={!confirmed}>
          Provide consent
        </Button>
      </form>
    </>
  );
}
