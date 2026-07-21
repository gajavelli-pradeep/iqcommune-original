import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { ConsentForm } from "./ConsentForm";
import type { ConsentSession } from "./SessionSummary";

/** P4 — `/consent`. A verified session to confirm, or why the link failed. */
export function ConsentPage({
  session,
  failure,
  token,
}: {
  session?: ConsentSession;
  failure?: TokenFailure;
  /** Forwarded to the write route, which re-verifies it server-side. */
  token?: string;
}) {
  return (
    <LinkPageShell width="760px" badge="Session Consent">
      {session ? (
        <ConsentForm session={session} token={token ?? ""} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
