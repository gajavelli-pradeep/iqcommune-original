/**
 * The numbered progress rail shown atop the onboarding and photo pages — byte
 * identical in both (audit M3). V7 `.stepper`: a bordered card of 28px circles
 * — done is a green tick, `current` is a dark-ink number, later steps are a
 * faint bordered number — separated by `›`.
 *
 * `current` is a zero-based index into `steps`.
 */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-0 overflow-x-auto rounded-[12px] border border-border bg-surface px-6 py-4">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "pending";
        return (
          <li key={step} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                state === "done"
                  ? "bg-green text-surface"
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
            {index < steps.length - 1 ? (
              <span aria-hidden className="mx-3 shrink-0 text-base text-border-strong">
                ›
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
