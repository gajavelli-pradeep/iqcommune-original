"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MENU_WIDTH = 190;

/**
 * A "⋯" trigger that opens a small dropdown of row actions.
 *
 * The menu is rendered in a portal with fixed positioning (anchored to the
 * trigger's rect, flipping upward near the viewport bottom) so it is NEVER clipped
 * by an ancestor's `overflow: hidden` / `overflow-x: auto` — the table card scrolls
 * horizontally, which would otherwise cut the menu off. Closes on outside click,
 * on scroll/resize, or after an item runs.
 */
export function RowActionsMenu({ actions, ariaLabel = "Row actions" }: { actions: RowAction[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function place() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const estHeight = actions.length * 37 + 8;
    const openUp = r.bottom + estHeight > window.innerHeight && r.top - estHeight > 8;
    const top = openUp ? r.top - estHeight - 4 : r.bottom + 4;
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setPos({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() { setOpen(false); }
    document.addEventListener("mousedown", onDown);
    // Capture-phase scroll catches scrolling inside the table's overflow container too.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) { setOpen(false); return; }
          place();
          setOpen(true);
        }}
        style={triggerStyle}
      >
        ⋯
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ ...menuStyle, top: pos.top, left: pos.left }}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              style={{ ...itemStyle, color: a.danger ? "var(--red)" : "var(--ink)" }}
            >
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
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
  position: "fixed",
  zIndex: 1000,
  width: MENU_WIDTH,
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
  borderRadius: 6,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};
