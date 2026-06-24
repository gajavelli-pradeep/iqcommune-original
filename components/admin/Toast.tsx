"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
  onHide: () => void;
}

// ---------------------------------------------------------------------------
// Icon colours — pulled from globals.css design tokens
// ---------------------------------------------------------------------------

const ICON_BG: Record<NonNullable<ToastProps["type"]>, string> = {
  success: "#2a6b2a", // --green
  error: "#a32d2d",   // --red
  info: "#185fa5",    // --blue
};

const ICON_LABEL: Record<NonNullable<ToastProps["type"]>, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------

export function Toast({ message, type = "success", visible, onHide }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 3000);
    return () => clearTimeout(t);
  }, [visible, onHide]);

  const resolvedType = type ?? "success";

  const wrapperStyle: CSSProperties = {
    position: "fixed",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    background: "var(--ink)",
    color: "#ffffff",
    borderRadius: 100,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 4px 16px rgba(20,18,12,0.25)",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.2s ease",
    whiteSpace: "nowrap",
  };

  const iconStyle: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: ICON_BG[resolvedType],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={wrapperStyle}
    >
      <span style={iconStyle} aria-hidden="true">
        {ICON_LABEL[resolvedType]}
      </span>
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useToast hook
// ---------------------------------------------------------------------------

interface ToastState {
  message: string;
  type: ToastProps["type"];
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  const showToast = useCallback(
    (message: string, type: ToastProps["type"] = "success") => {
      setToast({ message, type, visible: true });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
