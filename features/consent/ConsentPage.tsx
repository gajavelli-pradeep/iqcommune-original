import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { ConsentForm } from "./ConsentForm";
import type { ConsentSession } from "./SessionSummary";

/** P4 — `/consent`. A verified session to confirm, or why the link failed. */
export function ConsentPage({
  session,
  failure,
}: {
  session?: ConsentSession;
  failure?: TokenFailure;
}) {
  return (
    <LinkPageShell badge="Session Consent">
      {session ? (
        <ConsentForm session={session} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
