"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The console's deferred-action window (procedure §114, audit C6): an admin
 * action does not fire instantly — an Undo window opens first, and the action
 * commits only if it is not cancelled.
 *
 * `schedule(commit, label)` opens the window; `undo()` cancels it; the window
 * closes and `commit` runs when the timer elapses. `pending` drives the toast.
 * A second `schedule` supersedes the first (its timer is cleared), so rapid
 * actions never double-fire.
 *
 * Unmounting with a window still open commits it early rather than dropping it.
 * Only `undo()` cancels. The timer lives in the component that owns the button,
 * so closing a profile or switching panel used to take the action with it: the
 * admin saw a delete they never undid quietly undo itself, and the only way to
 * make one stick was to sit on the screen for the whole window. Leaving is not
 * cancelling, so it now fires on the way out.
 */

/**
 * How long an admin has to change their mind — every deferred action on the
 * site, since every one of them is scheduled through this hook.
 *
 * Ten, where procedure §114 and V7 both say fifteen (client, 2026-08-17). The
 * deviation is recorded here rather than left to be rediscovered: V7's own
 * script hard-codes "Sending in 15 seconds" in
 * `spec/v7/iqcommune-admin-console-automated.html`, so anyone diffing against
 * the prototype will find that string and should not correct this back to match
 * it.
 *
 * Exported because the toast counts down from it and the tests measure against
 * it. They each used to carry their own literal 15 — the shape where a window
 * changes in one place and stays fifteen in the two that describe it.
 */
export const UNDO_WINDOW_SECONDS = 10;
const UNDO_WINDOW_MS = UNDO_WINDOW_SECONDS * 1000;

export interface PendingAction {
  label: string;
  /** Counts down to zero, so the toast can say how long is actually left. */
  secondsLeft: number;
}

/**
 * Sends currently waiting out their window, keyed by what would be sent to whom.
 *
 * The Undo window is per-button, which is right until two buttons send the same
 * thing. The consent panel has exactly that: Part 1 offers "Send consent
 * request" straight after generating, and the Part 2 row for the same
 * practitioner offers it too, one above the other. Clicking the first starts a
 * fifteen-second hold during which nothing has been sent yet — so the row below
 * still, correctly, reads as unsent. An admin who clicks that one as well gets
 * two windows counting down independently, and the practitioner gets the same
 * email twice.
 *
 * Shared here rather than lifted into a context because the buttons that
 * collide are not siblings and do not share a subtree — they are in different
 * halves of the panel, and in `PractitionerProfile` different branches again.
 * What identifies a duplicate is the message and the recipient, which is
 * exactly the key, so a module-level set is both the smallest thing that works
 * and the honest shape of the problem.
 *
 * This is not a send-once lock. It lasts only while a window is open, and
 * clears the moment the send commits — a practitioner who never received the
 * email still gets chased by Resend, which is the whole point of that button.
 */
const holding = new Set<string>();
const listeners = new Set<() => void>();

function hold(key: string) {
  if (holding.has(key)) return;
  holding.add(key);
  for (const listener of listeners) listener();
}

function release(key: string) {
  if (!holding.delete(key)) return;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * Whether an identical send is already waiting out its window somewhere else on
 * the page. Always false on the server, where nothing has been clicked yet.
 */
export function useSendHeld(key: string | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (key ? holding.has(key) : false),
    () => false,
  );
}

/**
 * `key` identifies what this send would deliver and to whom. Passing one makes
 * the window visible to every other button carrying the same key; omitting it
 * keeps the hold local, which is right for an action only one control offers.
 */
export function useDeferredSend(key?: string) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  // Only the instance that took the key may give it back. Two buttons share a
  // key, so releasing on any unmount would hand away a hold this one never had
  // — and the panel unmounts the other button routinely, on every revalidate.
  const held = useRef(false);
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

  /**
   * Give the key back once the send has actually gone, not when the window
   * closes. The gap between the two is a request in flight, and a button
   * re-armed inside it is the same duplicate a moment later.
   */
  const finish = useCallback(
    (run: (() => void | Promise<void>) | null) => {
      void Promise.resolve(run?.()).finally(() => {
        if (key && held.current) {
          held.current = false;
          release(key);
        }
      });
    },
    [key],
  );

  const schedule = useCallback(
    (commit: () => void | Promise<void>, label: string) => {
      clear();
      if (key) {
        hold(key);
        held.current = true;
      }
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
        finish(run);
      }, UNDO_WINDOW_MS);
    },
    [clear, finish, key],
  );

  const undo = useCallback(() => {
    clear();
    setPending(null);
    if (key && held.current) {
      held.current = false;
      release(key);
    }
  }, [clear, key]);

  // `clear` nulls the ref, so the action is read out before it runs. Nothing is
  // left to flush once the timer has fired or `undo` has run — both clear it.
  useEffect(
    () => () => {
      const run = commitRef.current;
      clear();
      finish(run);
    },
    [clear, finish],
  );

  return { pending, schedule, undo };
}
