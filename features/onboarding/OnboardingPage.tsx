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
    <LinkPageShell width="860px" badge={["Practitioner Network", "Onboarding"]}>
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
