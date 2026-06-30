export const PIPELINE_STEPS = [
  "Applied",
  "Under Review",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

interface Props {
  status: string;
  /** Optional ISO-date strings keyed by step name, shown as "DD Mon" beside the step */
  timestamps?: Partial<Record<PipelineStep, string>>;
}

export function PipelineStepper({ status, timestamps }: Props) {
  const activeIdx = PIPELINE_STEPS.indexOf(status as PipelineStep);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {PIPELINE_STEPS.map((step, i) => {
        const state =
          i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
        const ts = timestamps?.[step];
        const label = ts
          ? new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : null;

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
                ...(state === "done"
                  ? { background: "var(--green)", color: "#fff" }
                  : state === "active"
                  ? { background: "var(--ink)", color: "#fff" }
                  : {
                      background: "var(--surface-sunken)",
                      border: "1.5px solid rgba(20,18,12,.18)",
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
