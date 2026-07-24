/**
 * The vertical pipeline-progress list on `/status` — one step per line, top
 * to bottom. Distinct from `components/ui/Stepper` (the horizontal rail used
 * on /onboarding and /photos): that one is shared and stays as-is, this one
 * is specific to an applicant checking where they stand.
 *
 * `current` is a zero-based index into `steps`. `StatusPage` pushes it past
 * the last index once the terminal stage (Empanelled) is reached, so every
 * step reads as done — a completed outcome, not an in-progress one.
 */
export function PipelineStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface px-6 py-5">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "pending";
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                state === "done"
                  ? "border border-green-edge bg-green-light text-green"
                  : state === "active"
                    ? "bg-ink text-surface"
                    : "border-[1.5px] border-border-strong bg-surface-soft text-ink-faint"
              }`}
            >
              {state === "done" ? <span aria-hidden>✓</span> : index + 1}
            </span>
            <span
              className={`text-base font-medium ${
                state === "done" ? "text-green" : state === "active" ? "text-ink" : "text-ink-faint"
              }`}
            >
              {step}
            </span>
            {state === "active" ? <span className="text-sm text-ink-faint">(in progress)</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
