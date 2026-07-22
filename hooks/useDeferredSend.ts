"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The console's deferred-action window (procedure §114, audit C6): an admin
 * action does not fire instantly — a 15-second Undo window opens first, and the
 * action commits only if it is not cancelled.
 *
 * `schedule(commit, label)` opens the window; `undo()` cancels it; the window
 * closes and `commit` runs when the timer elapses. `pending` drives the toast.
 * A second `schedule` supersedes the first (its timer is cleared), so rapid
 * actions never double-fire. The timer is always cleared on unmount.
 */

const UNDO_WINDOW_MS = 15_000;

export interface PendingAction {
  label: string;
}

export function useDeferredSend() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<(() => void | Promise<void>) | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    commitRef.current = null;
  }, []);

  const schedule = useCallback(
    (commit: () => void | Promise<void>, label: string) => {
      clear();
      commitRef.current = commit;
      setPending({ label });
      timer.current = setTimeout(() => {
        const run = commitRef.current;
        clear();
        setPending(null);
        void run?.();
      }, UNDO_WINDOW_MS);
    },
    [clear],
  );

  const undo = useCallback(() => {
    clear();
    setPending(null);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { pending, schedule, undo };
}
