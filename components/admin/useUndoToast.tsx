"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * V5 instant-undo toast (operating procedure: "the action is reversed immediately…
 * once the toast disappears, this option is gone"). The destructive action runs
 * immediately (soft-delete); the returned toast offers ~9s to Undo, which reverses
 * it. After the window, the soft-delete simply stands (still trash-recoverable 30d).
 *
 * Usage:
 *   const undo = useUndoToast();
 *   undo.show(`Request from ${r.name} deleted`, async () => { …restore… });
 *   return (<>…{undo.node}</>);
 */
const UNDO_MS = 9000;

export function useUndoToast() {
  const [state, setState] = useState<{ message: string; onUndo: () => void | Promise<void> } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const show = useCallback(
    (message: string, onUndo: () => void | Promise<void>) => {
      clear();
      setState({ message, onUndo });
      timer.current = setTimeout(() => setState(null), UNDO_MS);
    },
    [clear],
  );

  const handleUndo = useCallback(() => {
    clear();
    const s = state;
    setState(null);
    void s?.onUndo();
  }, [clear, state]);

  useEffect(() => clear, [clear]);

  const node = state ? (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 14,
        background: "var(--ink)", color: "var(--surface)",
        padding: "11px 14px 11px 18px", borderRadius: 10,
        fontSize: 13, boxShadow: "0 8px 30px rgba(0,0,0,.25)",
      }}
    >
      <span>{state.message}</span>
      <button
        type="button"
        onClick={handleUndo}
        style={{
          background: "none", border: "none", padding: "2px 4px", cursor: "pointer",
          color: "var(--gold-on-ink)", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
          textDecoration: "underline",
        }}
      >
        Undo
      </button>
    </div>
  ) : null;

  return { show, node };
}
