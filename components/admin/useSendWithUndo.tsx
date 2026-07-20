"use client";

import { useRef, useState } from "react";

// V6 §3.1: external (Type B) sends don't fire the instant Send is clicked — a 15s
// window opens with an Undo. Letting it elapse fires the action; Undo cancels it
// (the guarded action never runs). Internal (Type A) sends fire immediately.
const SEND_HOLD_MS = 15000;

type PendingSend = { label: string; remaining: number };

export function useSendWithUndo() {
  const [pending, setPending] = useState<PendingSend | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  function clearTimers() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    timerRef.current = null;
    tickRef.current = null;
  }

  /**
   * mode "instant" → fire now (Type A). mode "delayed" → hold 15s with an Undo,
   * then fire unless undone (Type B). `label` names the send in the toast.
   */
  function send(mode: "instant" | "delayed", label: string, action: () => void | Promise<void>) {
    if (mode === "instant") {
      void action();
      return;
    }
    clearTimers();
    cancelledRef.current = false;
    let remaining = Math.round(SEND_HOLD_MS / 1000);
    setPending({ label, remaining });
    tickRef.current = setInterval(() => {
      remaining -= 1;
      setPending((p) => (p ? { ...p, remaining } : p));
    }, 1000);
    timerRef.current = setTimeout(() => {
      clearTimers();
      setPending(null);
      if (!cancelledRef.current) void action();
    }, SEND_HOLD_MS);
  }

  function undo() {
    cancelledRef.current = true;
    clearTimers();
    setPending(null);
  }

  const node = pending ? (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "calc(100vw - 2rem)",
        boxSizing: "border-box",
        background: "var(--ink)",
        color: "var(--surface)",
        fontSize: 13,
        fontWeight: 500,
        padding: "11px 16px",
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(15,17,23,.28)",
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <span>
        {pending.label} — sending in {pending.remaining}s
      </span>
      <button
        type="button"
        onClick={undo}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,.4)",
          color: "var(--surface)",
          borderRadius: 100,
          padding: "3px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Undo
      </button>
    </div>
  ) : null;

  return { send, node };
}
