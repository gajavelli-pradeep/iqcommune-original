import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { OnboardingForm, type OnboardingPractitioner } from "./OnboardingForm";

/** P6 — `/onboarding`. A verified practitioner to empanel, or why the link failed. */
export function OnboardingPage({
  practitioner,
  failure,
  token,
  agreementDate,
}: {
  practitioner?: OnboardingPractitioner;
  failure?: TokenFailure;
  /** Forwarded to the write route, which re-verifies it server-side. */
  token?: string;
  /** Server-computed IST date for the agreement's "Date:" line (audit M7). */
  agreementDate?: string;
}) {
  return (
    <LinkPageShell
      width="860px"
      badge={["Practitioner", "Network"]}
      badgeStyle="lockup"
      /* 37px mark, as post-session photos: between the marketing 38 and the
         compact 34. */
      markSize={37}
      right={
        <>
          <span className="hidden text-md text-ink-muted sm:inline">Onboarding</span>
          <span className="hidden shrink-0 rounded-full border border-gold-border bg-gold-light px-2.5 py-[3px] text-xs font-semibold uppercase tracking-[0.06em] text-gold-dark sm:inline-flex">
            Step 2 of 2
          </span>
        </>
      }
    >
      {practitioner ? (
        <OnboardingForm
          practitioner={practitioner}
          token={token ?? ""}
          agreementDate={agreementDate ?? ""}
        />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
