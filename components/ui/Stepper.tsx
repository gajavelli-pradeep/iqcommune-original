/**
 * The numbered progress rail shown atop the onboarding and photo pages — byte
 * identical in both (audit M3). Steps before `current` render a tick, `current`
 * and earlier are gold, later steps are faint, and a `›` separates each pair.
 *
 * `current` is a zero-based index into `steps`.
 */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-sm ${
              index <= current ? "font-medium text-gold-dark" : "text-ink-faint"
            }`}
          >
            {index < current ? (
              <span aria-hidden>✓</span>
            ) : (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
            {step}
          </span>
          {index < steps.length - 1 ? (
            <span aria-hidden className="text-ink-faint">
              ›
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
