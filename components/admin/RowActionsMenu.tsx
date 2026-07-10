"use client";

import { useEffect, useRef, useState } from "react";

export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * A "⋯" trigger that opens a small right-aligned dropdown of row actions.
 * Closes on outside click or after an item runs. `stopPropagation` keeps clicks
 * from bubbling to a clickable table row. Renders nothing when there are no
 * actions (so a row with no permitted actions shows an empty cell).
 */
export function RowActionsMenu({ actions, ariaLabel = "Row actions" }: { actions: RowAction[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={triggerStyle}
      >
        ⋯
      </button>
      {open && (
        <div role="menu" onClick={(e) => e.stopPropagation()} style={menuStyle}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              style={{ ...itemStyle, color: a.danger ? "var(--red)" : "var(--ink)" }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const triggerStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1,
  padding: "4px 10px",
  borderRadius: 100,
  border: "1px solid rgba(20,18,12,.18)",
  background: "#fff",
  color: "var(--ink-soft)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 60,
  minWidth: 150,
  padding: 4,
  textAlign: "left",
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,.12)",
  borderRadius: 10,
  boxShadow: "0 14px 36px -14px rgba(20,16,10,0.28), 0 2px 6px rgba(20,16,10,0.06)",
};

const itemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 13,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};
