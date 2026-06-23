"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef } from "react";

/** Reusable centered modal shell with dark header, ESC/backdrop close, and a footer slot. */
export function FormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) cardRef.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ background: "#0f1117", padding: "1.1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div id={titleId} style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 18, width: 28, height: 28, borderRadius: "50%", fontFamily: "inherit" }}>✕</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>{children}</div>

        {footer && (
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(15,17,23,.10)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: ".65rem", flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Shared field styles ─────────────────────────────────────────────────────────

export const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#9496a1", marginBottom: 4 };
export const fieldInputStyle: React.CSSProperties = { width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
export const primaryBtn: React.CSSProperties = { background: "#0f1117", color: "#fff", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
export const ghostBtn: React.CSSProperties = { background: "#fff", color: "#4a4d5c", border: "1px solid rgba(15,17,23,.18)", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
