import type { Metadata } from "next";

import { ConsentPage } from "@/features/consent/ConsentPage";
import { verifyToken } from "@/lib/tokens";
import { getConsentSession } from "@/services/link-pages";

/** Consent links identify a specific session and must never be indexed. */
export const metadata: Metadata = {
  title: "Session consent — iqcommune",
  robots: { index: false, follow: false },
};

export default async function Consent({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("consent", t);

  if (!result.ok) return <ConsentPage failure={result.reason} />;

  // Loaded from the row the token names. A missing or already-consumed row is
  // the same thing as a bad link to the person holding it, so it renders the
  // same state rather than a second error design.
  const session = await getConsentSession(result.payload.id);
  if (!session) return <ConsentPage failure="malformed" />;

  return <ConsentPage session={session} token={t} />;
}
