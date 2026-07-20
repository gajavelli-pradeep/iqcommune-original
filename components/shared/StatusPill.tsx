// V6 pixel-match: pill borders use the solid pastel `-m` tokens (mockup `.pill`
// borders), not the full-saturation colour — softer outline, same tinted bg + dot.
export const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Applied:             { bg: "var(--purple-light)",  color: "var(--purple)",  border: "var(--purple-m)", dot: "var(--purple)"  },
  "Under Review":      { bg: "var(--amber-light)",   color: "var(--amber)",   border: "var(--amber-m)",  dot: "var(--amber)"   },
  "Screening Done":    { bg: "var(--blue-light)",    color: "var(--blue)",    border: "var(--blue-m)",   dot: "var(--blue)"    },
  "Agreement Sent":    { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Empanelled:          { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Rejected:            { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-m)",   dot: "var(--red)" },
  New:                 { bg: "var(--purple-light)",  color: "var(--purple)",  border: "var(--purple-m)", dot: "var(--purple)"  },
  Matched:             { bg: "var(--blue-light)",    color: "var(--blue)",    border: "var(--blue-m)",   dot: "var(--blue)"    },
  Confirmed:           { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Completed:           { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  // V6: pending-state pills are RED (matching the mockup's red pending cards).
  "Pending consent":   { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-m)",   dot: "var(--red)" },
  "Consent given":     { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Pending:             { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-m)",   dot: "var(--red)" },
  Paid:                { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Upcoming:            { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Cancelled:           { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-m)",   dot: "var(--red)" },
  "Pending signature": { bg: "var(--red-light, #fdf0f0)", color: "var(--red)", border: "var(--red-m)",   dot: "var(--red)" },
  Active:              { bg: "var(--green-light)",   color: "var(--green)",   border: "var(--green-m)",  dot: "var(--green)"  },
  Deactivated:         { bg: "var(--surface-sunken)", color: "var(--ink-soft)", border: "var(--border-strong)", dot: "var(--ink-faint)" },
};

const FALLBACK = { bg: "var(--surface-sunken)", color: "var(--ink-faint)", border: "rgba(15,17,23,.10)", dot: "var(--ink-faint)" };

// V5-MATCH: display wording from the mockup. The underlying status VALUES are
// unchanged (logic/DB still use "Screening Done" etc.) — only the label shown to
// the user is remapped to the mockup's sentence-case / wording.
const STATUS_DISPLAY: Record<string, string> = {
  "Screening Done": "Screening done",
  "Agreement Sent": "Agreement sent",
  "Consent given": "Consent done",
  // V6 mockup wording (underlying DB values unchanged): a matched request reads
  // "Matched"; a session's Upcoming state reads "Confirmed"; an active agreement
  // reads "Signed"; an unsigned agreement reads "Pending".
  Confirmed: "Matched",
  Upcoming: "Confirmed",
  Active: "Signed",
  "Pending signature": "Pending",
};

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
      {STATUS_DISPLAY[status] ?? status}
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
  labels,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  // Optional per-usage option-text override (value → label), taking precedence over
  // the shared STATUS_DISPLAY map. Lets one dropdown relabel without disturbing others.
  labels?: Record<string, string>;
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
          {labels?.[o] ?? STATUS_DISPLAY[o] ?? o}
        </option>
      ))}
    </select>
  );
}
