/**
 * The four forward-moving stages of practitioner empanelment, shared between
 * the status service (`services/link-pages.ts`, which computes where an
 * application sits) and the `/status` page (which draws it with the existing
 * `components/ui/Stepper`). Lives in `constants/`, not `features/status/`,
 * because a `services/` module may not import from `features/` (audit H6) —
 * this is the neutral ground both sides can reach.
 *
 * "Rejected"/"Deactivated" and the legacy enum values ("New", "Screening",
 * "Withdrawn") are deliberately absent — they are not a fifth step, they are a
 * different outcome, and `getApplicationStatus` maps them to
 * `pipelineStep: null` instead.
 */
export const PIPELINE_STEPS = ["Applied", "Screening Done", "Agreement Sent", "Empanelled"] as const;

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  PIPELINE_STEPS.map((step, index) => [step, index]),
);

/** `null` for any status outside the four active-pipeline stages. */
export function pipelineStepFor(status: string): number | null {
  return status in STEP_INDEX ? STEP_INDEX[status] : null;
}
