import type { Metadata } from "next";

import { RatePage } from "@/features/rate/RatePage";
import { verifyToken } from "@/lib/tokens";
import { getRatedSession } from "@/services/link-pages";

/** Rating links must never be indexed — they identify a specific session. */
export const metadata: Metadata = {
  title: "Session feedback — iqcommune",
  robots: { index: false, follow: false },
};

export default async function Rate({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("rate", t);

  if (!result.ok) return <RatePage failure={result.reason} />;

  // Loaded from the row the token names. A missing or already-consumed row is
  // the same thing as a bad link to the person holding it, so it renders the
  // same state rather than a second error design.
  const session = await getRatedSession(result.payload.id);
  if (!session) return <RatePage failure="malformed" />;

  return <RatePage session={session} token={t} />;
}
