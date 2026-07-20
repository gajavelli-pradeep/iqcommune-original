"use client";

import type { RowAction } from "@/components/admin/table-types";

/**
 * Inline row-action buttons — the V5 "iqcommune-admin-console.html" pattern
 * (Copy link · PDF · Mark received · Void …) rendered as small buttons in the
 * Actions cell instead of a "⋯" dropdown. Consumes the shared RowAction[] shape
 * (see table-types.ts), so a table's action data is presentation-agnostic.
 *
 * Variants: `primary` → gold fill with an ink label (brand contrast rule — never
 * white on gold); `danger` → red ghost; default → neutral ghost. Buttons wrap
 * within the cell (the table card scrolls horizontally) and stop click
 * propagation so a row-level onClick doesn't also fire.
 */
export function RowActionsInline({ actions, ariaLabel = "Row actions" }: { actions: RowAction[]; ariaLabel?: string }) {
  if (actions.length === 0) return null;
  return (
    <div role="group" aria-label={ariaLabel} style={wrapStyle}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={(e) => { e.stopPropagation(); a.onClick(); }}
          onMouseEnter={(e) => { if (!a.primary) e.currentTarget.style.background = "var(--surface-soft)"; }}
          onMouseLeave={(e) => { if (!a.primary) e.currentTarget.style.background = "var(--surface)"; }}
          style={a.primary ? primaryStyle : a.danger ? dangerStyle : ghostStyle}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const baseBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 11px",
  fontSize: 12,
  borderRadius: 7,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 500,
  whiteSpace: "nowrap",
  lineHeight: 1.2,
};

const ghostStyle: React.CSSProperties = {
  ...baseBtn,
  background: "var(--surface)",
  border: "1px solid rgba(15,17,23,.18)",
  color: "var(--ink)",
};

const dangerStyle: React.CSSProperties = {
  ...baseBtn,
  background: "var(--surface)",
  border: "1px solid var(--red-border)",
  color: "var(--red)",
};

const primaryStyle: React.CSSProperties = {
  ...baseBtn,
  background: "var(--gold)",
  border: "1px solid var(--gold)",
  color: "var(--ink)",
  fontWeight: 600,
};
