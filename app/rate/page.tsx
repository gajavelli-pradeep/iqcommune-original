import type { Metadata } from "next";

import { RatePage } from "@/features/rate/RatePage";
import { verifyToken } from "@/lib/tokens";

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

  // The session is loaded from the row the token names — never from the URL.
  // Until the data layer is wired the page renders its invalid-link state
  // rather than inventing a session, which is the honest half-built state.
  return <RatePage failure="malformed" />;
}
