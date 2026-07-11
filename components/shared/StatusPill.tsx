export const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Applied:             { bg: "var(--purple-light)",  color: "var(--purple)",  border: "var(--purple)",  dot: "var(--purple)"  },
  "Under Review":      { bg: "var(--amber-light)",   color: "var(--amber)",   border: "var(--amber)",   dot: "var(--amber)"   },
  "Screening Done":    { bg: "var(--blue-light)",    color: "var(--blue)",    border: "var(--blue)",    dot: "var(--blue)"    },
  "Agreement Sent":    { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Empanelled:          { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Rejected:            { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-border)", dot: "var(--red)" },
  New:                 { bg: "var(--purple-light)",  color: "var(--purple)",  border: "var(--purple)",  dot: "var(--purple)"  },
  Matched:             { bg: "var(--blue-light)",    color: "var(--blue)",    border: "var(--blue)",    dot: "var(--blue)"    },
  Confirmed:           { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Completed:           { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  "Pending consent":   { bg: "var(--amber-light)",   color: "var(--amber)",   border: "var(--amber)",   dot: "var(--amber)"   },
  "Consent given":     { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Pending:             { bg: "var(--amber-light)",   color: "var(--amber)",   border: "var(--amber)",   dot: "var(--amber)"   },
  Paid:                { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Upcoming:            { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
  Cancelled:           { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-border)", dot: "var(--red)" },
  "Pending signature": { bg: "var(--amber-light)",   color: "var(--amber)",   border: "var(--amber)",   dot: "var(--amber)"   },
  Active:              { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-border)", dot: "var(--green)"  },
};

const FALLBACK = { bg: "var(--surface-sunken)", color: "var(--ink-faint)", border: "rgba(20,18,12,.10)", dot: "var(--ink-faint)" };

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? FALLBACK;
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

// Inline, status-tinted <select> — the editable sibling of StatusPill, styled from
// the same token map so an editable status cell reads identically to a static one.
// stopPropagation keeps opening the dropdown from triggering a row's click handler.
export function StatusSelect({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const s = STATUS_STYLES[value] ?? FALLBACK;
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const next = e.target.value;
        if (next !== value) onChange(next);
      }}
      style={{
        fontFamily: "inherit",
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 100,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
