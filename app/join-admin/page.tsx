import type { Metadata } from "next";

import { JoinAdminPage } from "@/features/join-admin/JoinAdminPage";
import { verifyToken } from "@/lib/tokens";

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

  // The invited email and role come from the invite row the token names — never
  // from the URL. This is the sharpest case of that rule in the product: a role
  // read from a query parameter would let anyone grant themselves admin.
  //
  // Single-use enforcement (marking the invite consumed) and account creation
  // belong to the auth foundation, which is not built. Until then this renders
  // the invalid-link state rather than a form that appears to create an account
  // and does not.
  return <JoinAdminPage failure="malformed" />;
}
