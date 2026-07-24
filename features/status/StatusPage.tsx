import { Stepper } from "@/components/ui/Stepper";
import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import { PIPELINE_STEPS } from "@/constants/pipeline";
import type { TokenFailure } from "@/lib/tokens";
import type { ApplicationStatus } from "@/types/link-pages";

/**
 * `/status` — a practitioner checking where their application stands.
 *
 * Read-only and single-purpose, unlike the other four tokenised pages: there
 * is no form here, so it does not split into a card + form pair the way
 * `/rate` and `/consent` do. One of two mutually exclusive states, same as
 * every other link page — a status to show, or why the link did not work.
 */
export function StatusPage({
  status,
  failure,
}: {
  status?: ApplicationStatus;
  failure?: TokenFailure;
}) {
  return (
    <LinkPageShell width="720px" badge="Application Status">
      {status ? (
        <section className="rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="mb-2 text-2xl font-semibold text-ink">{status.headline}</h1>
          <p className="text-base leading-[1.6] text-ink-muted">{status.detail}</p>
          <p className="mt-6 text-sm text-ink-faint">
            Hi {status.firstName} — applied on {status.appliedOn}.
          </p>
          {status.pipelineStep !== null ? (
            <div className="mt-8 text-left">
              <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-eyebrow text-ink-faint">
                Pipeline progress
              </h2>
              <Stepper
                steps={PIPELINE_STEPS}
                // Empanelled is a completed outcome, not an in-progress step —
                // pushing `current` past the final index makes every step
                // read as done (✓) instead of leaving the last one "active".
                current={
                  status.pipelineStep === PIPELINE_STEPS.length - 1
                    ? PIPELINE_STEPS.length
                    : status.pipelineStep
                }
              />
            </div>
          ) : null}
        </section>
      ) : (
        <InvalidLink reason={failure ?? "malformed"} />
      )}
    </LinkPageShell>
  );
}
