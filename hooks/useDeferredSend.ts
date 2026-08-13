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

const UNDO_WINDOW_SECONDS = 15;
const UNDO_WINDOW_MS = UNDO_WINDOW_SECONDS * 1000;

export interface PendingAction {
  label: string;
  /** Counts down to zero, so the toast can say how long is actually left. */
  secondsLeft: number;
}

export function useDeferredSend() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const commitRef = useRef<(() => void | Promise<void>) | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (ticker.current) clearInterval(ticker.current);
    timer.current = null;
    ticker.current = null;
    commitRef.current = null;
  }, []);

  const schedule = useCallback(
    (commit: () => void | Promise<void>, label: string) => {
      clear();
      commitRef.current = commit;
      setPending({ label, secondsLeft: UNDO_WINDOW_SECONDS });

      // Display only — `timer` below is what actually fires. The two are
      // started together and cleared together, so the number reaching zero and
      // the send happening are the same moment to a reader.
      ticker.current = setInterval(() => {
        setPending((current) =>
          current ? { ...current, secondsLeft: Math.max(0, current.secondsLeft - 1) } : current,
        );
      }, 1000);

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
