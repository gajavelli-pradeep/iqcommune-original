import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { PhotoSubmissionForm, type PhotoSession } from "./PhotoSubmissionForm";

/** P5 — `/submit-photos`. A verified session to upload against, or why not. */
export function PhotosPage({
  session,
  failure,
  token,
}: {
  session?: PhotoSession;
  failure?: TokenFailure;
  /** Forwarded to the write route, which re-verifies it server-side. */
  token?: string;
}) {
  return (
    // 37px mark: this page's V7 nav sits between the marketing 38 and the
    // compact 34, as onboarding's does.
    <LinkPageShell width="860px" badge="Post-Session" markSize={37}>
      {session ? (
        <PhotoSubmissionForm session={session} token={token ?? ""} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
