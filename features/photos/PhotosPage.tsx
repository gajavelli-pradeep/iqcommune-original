import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import type { TokenFailure } from "@/lib/tokens";

import { PhotoSubmissionForm, type PhotoSession } from "./PhotoSubmissionForm";

/** P5 — `/submit-photos`. A verified session to upload against, or why not. */
export function PhotosPage({
  session,
  failure,
}: {
  session?: PhotoSession;
  failure?: TokenFailure;
}) {
  return (
    <LinkPageShell badge={["Practitioner Network", "Post-Session"]}>
      {session ? (
        <PhotoSubmissionForm session={session} />
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
