import type { Metadata } from "next";

import { JoinAdminPage } from "@/features/join-admin/JoinAdminPage";
import { verifyToken } from "@/lib/tokens";
import { getAdminInvite } from "@/services/link-pages";

/** Invite links create console access. Never indexable. */
export const metadata: Metadata = {
  title: "Set up your account — iqcommune",
  robots: { index: false, follow: false },
};

export default async function JoinAdmin({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("invite", t);

  if (!result.ok) return <JoinAdminPage failure={result.reason} />;

  // Loaded from the row the token names. A missing or already-consumed row is
  // the same thing as a bad link to the person holding it, so it renders the
  // same state rather than a second error design.
  const invite = await getAdminInvite(result.payload.id);
  if (!invite) return <JoinAdminPage failure="malformed" />;

  return <JoinAdminPage invite={invite} token={t} />;
}
