import type { Metadata } from "next";

import { ConsentPage } from "@/features/consent/ConsentPage";
import { verifyToken } from "@/lib/tokens";

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

  // Loaded from the row the token names once the data layer lands — never from
  // the URL. A payout figure taken from a query parameter would let anyone
  // display any amount on an iqcommune-branded consent page.
  return <ConsentPage failure="malformed" />;
}
