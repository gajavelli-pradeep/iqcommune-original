// V4 shows a 4-step pipeline (no "Under Review" — that stays a status/filter only).
export const PIPELINE_STEPS = [
  "Applied",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

// Map every practitioner status to the current step index. "Under Review" isn't a
// visible step, so it maps to the Applied milestone (applied, not yet screened).
const STATUS_STEP_INDEX: Record<string, number> = {
  Applied: 0,
  "Under Review": 0,
  "Screening Done": 1,
  "Agreement Sent": 2,
  Empanelled: 3,
};

interface Props {
  status: string;
  /** Optional ISO-date strings keyed by step name, shown as "DD Mon" beside the step */
  timestamps?: Partial<Record<PipelineStep, string>>;
}

export function PipelineStepper({ status, timestamps }: Props) {
  const activeIdx = STATUS_STEP_INDEX[status] ?? PIPELINE_STEPS.indexOf(status as PipelineStep);
  // The final step (Empanelled) is a terminal, achieved state — show it as done
  // (green ✓), matching V4, rather than an in-progress "active" circle.
  const terminalReached = activeIdx === PIPELINE_STEPS.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {PIPELINE_STEPS.map((step, i) => {
        const state =
          i < activeIdx ? "done" : i === activeIdx ? (terminalReached ? "done" : "active") : "pending";
        const ts = timestamps?.[step];
        // Every step shows a trailing value: the recorded date when known, else "—"
        // (both reached-but-undated and not-yet-reached stages), so the column always
        // has a consistent date/dash.
        const label = ts
          ? new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : "—";

        return (
          <div
            key={step}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            {/* Step indicator */}
            <div
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                boxSizing: "border-box",
                // V4 style: done = soft light-green circle (not solid); active = dark ink; pending = soft grey.
                ...(state === "done"
                  ? { background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green-border)" }
                  : state === "active"
                  ? { background: "var(--ink)", color: "#fff" }
                  : {
                      background: "var(--surface-sunken)",
                      border: "1px solid rgba(15,17,23,.18)",
                      color: "var(--ink-faint)",
                    }),
              }}
            >
              {state === "done" ? "✓" : i + 1}
            </div>

            {/* Step label */}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                ...(state === "done"
                  ? { color: "var(--green)", fontWeight: 500 }
                  : state === "active"
                  ? { color: "var(--ink)", fontWeight: 600 }
                  : { color: "var(--ink-faint)" }),
              }}
            >
              {step}
            </span>

            {/* Optional timestamp */}
            {label && (
              <span style={{ fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
