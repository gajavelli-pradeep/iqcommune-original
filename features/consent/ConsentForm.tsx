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
        className="mt-4 rounded-lg border border-border bg-surface px-9 py-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!confirmed) return;
          const receipt = await submit("/api/consents");
          if (receipt) setRecordedAt(formatDateTimeIST(receipt.at));
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

        <FormError message={submitError} />

        <Button type="submit" variant="submit" busy={busy} busyLabel="Recording…" disabled={!confirmed}>
          Provide consent
        </Button>
      </form>
    </>
  );
}
