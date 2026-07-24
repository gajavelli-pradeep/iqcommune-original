import type { Metadata } from "next";

import { StatusPage } from "@/features/status/StatusPage";
import { verifyToken } from "@/lib/tokens";
import { getApplicationStatus } from "@/services/link-pages";

/** Status links must never be indexed — they identify a specific applicant. */
export const metadata: Metadata = {
  title: "Application status — iqcommune",
  robots: { index: false, follow: false },
};

export default async function Status({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("status", t);

  if (!result.ok) return <StatusPage failure={result.reason} />;

  // Loaded from the row the token names. A missing or withdrawn application
  // is the same thing as a bad link to the person holding it, so it renders
  // the same state rather than a second error design.
  const status = await getApplicationStatus(result.payload.id);
  if (!status) return <StatusPage failure="malformed" />;

  return <StatusPage status={status} />;
}
