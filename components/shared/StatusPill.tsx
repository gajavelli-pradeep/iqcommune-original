const STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Applied:           { bg: "#eeedfe", color: "#534ab7", border: "#afa9ec", dot: "#534ab7" },
  "Under Review":    { bg: "#faeeda", color: "#854f0b", border: "#fac775", dot: "#854f0b" },
  "Screening Done":  { bg: "#e6f1fb", color: "#185fa5", border: "#85b7eb", dot: "#185fa5" },
  "Agreement Sent":  { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Empanelled:        { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Rejected:          { bg: "#fdf0f0", color: "#a32d2d", border: "var(--red-border)", dot: "#a32d2d" },
  New:               { bg: "#eeedfe", color: "#534ab7", border: "#afa9ec", dot: "#534ab7" },
  Matched:           { bg: "#e6f1fb", color: "#185fa5", border: "#85b7eb", dot: "#185fa5" },
  Confirmed:         { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Completed:         { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  "Pending consent": { bg: "#faeeda", color: "#854f0b", border: "#fac775", dot: "#854f0b" },
  "Consent given":   { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Pending:           { bg: "#fdf0f0", color: "#a32d2d", border: "var(--red-border)", dot: "#a32d2d" },
  Paid:              { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Upcoming:          { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
  Cancelled:         { bg: "#fdf0f0", color: "#a32d2d", border: "var(--red-border)", dot: "#a32d2d" },
  "Pending signature":{ bg: "#faeeda", color: "#854f0b", border: "#fac775", dot: "#854f0b" },
  Active:            { bg: "#eef7ee", color: "#2a6b2a", border: "#c8e6c8", dot: "#2a6b2a" },
};

const FALLBACK = { bg: "#f8f7f4", color: "#71717f", border: "rgba(20,18,12,.10)", dot: "#71717f" };

export function StatusPill({ status }: { status: string }) {
  const s = STYLES[status] ?? FALLBACK;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: 100,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {status}
    </span>
  );
}
