import { LinkPageShell } from "@/components/layout/LinkPageShell";
import type { TokenFailure } from "@/lib/tokens";

import { InvalidLink } from "@/features/link/InvalidLink";
import { RateForm } from "./RateForm";
import type { RatedSession } from "./SessionDetailsCard";

/**
 * P3 — `/rate`. One of two mutually exclusive states: a session to rate, or an
 * explanation of why the link did not work. There is no third state where the
 * form renders without a verified token.
 */
export function RatePage({
  session,
  failure,
}: {
  session?: RatedSession;
  failure?: TokenFailure;
}) {
  return (
    <LinkPageShell badge="Session Feedback">
      {session ? <RateForm session={session} /> : <InvalidLink reason={failure ?? "malformed"} />}
    </LinkPageShell>
  );
}
