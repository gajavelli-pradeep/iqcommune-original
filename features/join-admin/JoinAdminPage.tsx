import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { AccountSetupForm, type AdminInvite } from "./AccountSetupForm";

/** P7 — `/join-admin`. A verified invite to accept, or why the link failed. */
export function JoinAdminPage({
  invite,
  failure,
  token,
}: {
  invite?: AdminInvite;
  failure?: TokenFailure;
  /** Forwarded to the write route, which re-verifies it server-side. */
  token?: string;
}) {
  return (
    <LinkPageShell badge="Account Setup">
      {invite ? (
        <AccountSetupForm invite={invite} token={token ?? ""} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
