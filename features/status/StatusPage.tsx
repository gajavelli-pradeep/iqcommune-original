import { LinkPageShell } from "@/components/layout/LinkPageShell";
import { InvalidLink } from "@/features/link/InvalidLink";
import { PipelineStepper } from "@/features/status/PipelineStepper";
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
        <section className="rounded-lg border border-border bg-surface p-8">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div>
              <h1 className="mb-1.5 text-2xl font-semibold text-ink">{status.headline}</h1>
              <p className="text-base leading-[1.6] text-ink-muted">{status.detail}</p>
            </div>
            <p className="shrink-0 text-sm leading-[1.6] text-ink-faint sm:text-right">
              {`Hi ${status.firstName}`}
              <br />
              {`Applied on ${status.appliedOn}`}
            </p>
          </div>
          {status.pipelineStep !== null ? (
            <div className="pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-eyebrow text-ink-faint">
                Pipeline progress
              </h2>
              <PipelineStepper
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
