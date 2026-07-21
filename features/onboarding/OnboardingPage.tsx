import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { OnboardingForm, type OnboardingPractitioner } from "./OnboardingForm";

/** P6 — `/onboarding`. A verified practitioner to empanel, or why the link failed. */
export function OnboardingPage({
  practitioner,
  failure,
}: {
  practitioner?: OnboardingPractitioner;
  failure?: TokenFailure;
}) {
  return (
    <LinkPageShell badge={["Practitioner Network", "Onboarding"]}>
      {practitioner ? (
        <OnboardingForm practitioner={practitioner} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
