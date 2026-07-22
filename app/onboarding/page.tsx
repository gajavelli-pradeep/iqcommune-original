import type { Metadata } from "next";

import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { verifyToken } from "@/lib/tokens";
import { getOnboardingPractitioner } from "@/services/link-pages";

/** Onboarding links carry an identified practitioner; never indexable. */
export const metadata: Metadata = {
  title: "Practitioner onboarding — iqcommune",
  robots: { index: false, follow: false },
};

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("onboarding", t);

  if (!result.ok) return <OnboardingPage failure={result.reason} />;

  // Loaded from the row the token names. A missing or already-consumed row is
  // the same thing as a bad link to the person holding it, so it renders the
  // same state rather than a second error design.
  const practitioner = await getOnboardingPractitioner(result.payload.id);
  if (!practitioner) return <OnboardingPage failure="malformed" />;

  // Computed once, server-side, in IST (audit M7): a stable value the client
  // renders verbatim, so there is no UTC/IST hydration mismatch on the agreement
  // date. This route is already dynamic (it reads the token), so it recomputes
  // per request.
  const agreementDate = new Date().toLocaleDateString("en-IN", {
    dateStyle: "long",
    timeZone: "Asia/Kolkata",
  });

  return <OnboardingPage practitioner={practitioner} token={t} agreementDate={agreementDate} />;
}
