import type { Metadata } from "next";

import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { verifyToken } from "@/lib/tokens";

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

  // The practitioner is read from the row the token names once the data layer
  // lands. This is the page where that matters most: the details shown are the
  // details being signed for, and taking them from the URL would let anyone
  // generate an agreement naming anyone.
  return <OnboardingPage failure="malformed" />;
}
