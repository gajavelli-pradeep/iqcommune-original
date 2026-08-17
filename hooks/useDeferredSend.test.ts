import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNDO_WINDOW_SECONDS, useDeferredSend, useSendHeld } from "./useDeferredSend";

/** The whole window, in ms — every 'let it elapse' below advances by this. */
const WINDOW = UNDO_WINDOW_SECONDS * 1000;

/**
 * The console's Undo window (procedure §114). The action must fire
 * only if the window elapses, and never if it is undone.
 */
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDeferredSend", () => {
  it("holds an action for ten seconds", () => {
    // The one place the number itself is asserted. Everything below derives
    // from the constant so it cannot drift, which also means none of it would
    // notice the window being changed — this is what does. Ten is the client's
    // figure (2026-08-17), against the fifteen in procedure §114 and V7.
    expect(UNDO_WINDOW_SECONDS).toBe(10);
  });

  it("commits the action once the window elapses", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Matching…"));
    expect(result.current.pending).toEqual({ label: "Matching…", secondsLeft: UNDO_WINDOW_SECONDS });
    expect(commit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(WINDOW));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
  });

  it("counts the window down so the toast can say what is left", () => {
    // A static number says a window exists; it does not say whether there is
    // still time to stop it, which is the only thing being read.
    //
    // Counted off the window rather than from fixed seconds: written as "9
    // seconds leaves 5", this said nothing about counting down and everything
    // about the window being fifteen, and it broke the day it was not.
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "Matching…"));
    expect(result.current.pending?.secondsLeft).toBe(UNDO_WINDOW_SECONDS);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.pending?.secondsLeft).toBe(UNDO_WINDOW_SECONDS - 1);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.pending?.secondsLeft).toBe(UNDO_WINDOW_SECONDS - 3);

    // The label is carried through untouched — only the number moves.
    expect(result.current.pending?.label).toBe("Matching…");
  });

  it("restarts the count when a second send supersedes the first", () => {
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "First…"));
    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current.pending?.secondsLeft).toBe(UNDO_WINDOW_SECONDS - 3);

    act(() => result.current.schedule(vi.fn(), "Second…"));
    expect(result.current.pending).toEqual({ label: "Second…", secondsLeft: UNDO_WINDOW_SECONDS });
  });

  it("stops ticking once the window closes", () => {
    // The interval outliving the timeout would leave a toast counting past
    // zero, or a stray timer running after the component is gone.
    const { result, unmount } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "Matching…"));
    act(() => vi.advanceTimersByTime(WINDOW));
    expect(result.current.pending).toBeNull();

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.pending).toBeNull();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("commits a still-open window when the component unmounts", () => {
    // The admin clicks Delete, then closes the profile or switches panel before
    // the window is up. That unmounts the button holding the timer. Discarding the
    // action there reads as the delete undoing itself: they undid nothing, and
    // the only way to make it stick would be to sit on the screen and wait.
    // Leaving is not undoing, so the window closes early rather than silently.
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Deleting Vikram Kulkarni…"));
    act(() => vi.advanceTimersByTime(4_000));
    unmount();

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not commit an undone action when the component later unmounts", () => {
    // The flush above must not resurrect what Undo already cancelled.
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Deleting Vikram Kulkarni…"));
    act(() => result.current.undo());
    unmount();

    expect(commit).not.toHaveBeenCalled();
  });

  it("does not commit twice when the window elapses and the component unmounts", () => {
    // The timer already ran the action and cleared the ref; unmounting after
    // must not send it a second time.
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Deleting Vikram Kulkarni…"));
    act(() => vi.advanceTimersByTime(WINDOW));
    unmount();

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not commit if undone within the window", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredSend());

    // Undone with time to spare, then left well past where it would have fired.
    act(() => result.current.schedule(commit, "Deactivating…"));
    act(() => vi.advanceTimersByTime(WINDOW / 2));
    act(() => result.current.undo());
    act(() => vi.advanceTimersByTime(WINDOW));

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
  });

  it("a second schedule supersedes the first — only the latest fires", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(first, "First…"));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => result.current.schedule(second, "Second…"));
    act(() => vi.advanceTimersByTime(WINDOW));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

/**
 * Two buttons, one email.
 *
 * The window is per-button, which is fine until two buttons send the same thing
 * — Part 1's "Send consent request" sits directly above the Part 2 row offering
 * it for the same practitioner. While the window is open nothing has been sent
 * yet, so the row below still reads as unsent, and an admin who clicks it too
 * gets two windows counting down and the practitioner gets two emails.
 *
 * Keys are unique per test on purpose: the register is module-level, so a test
 * that leaked a hold would silently arm the next one.
 */
describe("the same send offered twice", () => {
  it("shows as held everywhere while one window is open", () => {
    const key = "consent-request:held";
    const button = renderHook(() => useDeferredSend(key));
    const twin = renderHook(() => useSendHeld(key));

    expect(twin.result.current).toBe(false);
    act(() => button.result.current.schedule(vi.fn(), "Sending…"));
    expect(twin.result.current).toBe(true);
  });

  it("leaves a different message to the same person alone", () => {
    // Two emails, not one sent twice. Holding both would stop an admin doing
    // two legitimate things to the same record in the same minute.
    const button = renderHook(() => useDeferredSend("consent-request:distinct"));
    const other = renderHook(() => useSendHeld("photo-guide:distinct"));

    act(() => button.result.current.schedule(vi.fn(), "Sending…"));
    expect(other.result.current).toBe(false);
  });

  it("releases once the send has actually gone, so a real resend still works", async () => {
    // The point of the whole feature: this is a hold for the length of one
    // window, not a send-once lock. A practitioner who never got the email is
    // chased by pressing the same button again.
    const key = "consent-request:released";
    const button = renderHook(() => useDeferredSend(key));
    const twin = renderHook(() => useSendHeld(key));

    act(() => button.result.current.schedule(vi.fn(), "Sending…"));
    expect(twin.result.current).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(WINDOW);
    });
    expect(twin.result.current).toBe(false);
  });

  it("releases immediately on undo", () => {
    // Nothing was sent, so nothing should stay locked — the admin who undid it
    // may well want to send a corrected version straight away.
    const key = "consent-request:undone";
    const button = renderHook(() => useDeferredSend(key));
    const twin = renderHook(() => useSendHeld(key));

    act(() => button.result.current.schedule(vi.fn(), "Sending…"));
    act(() => button.result.current.undo());
    expect(twin.result.current).toBe(false);
  });

  it("does not let the other button give away a hold it never took", async () => {
    // The subtle one. Both buttons share a key, and the panel unmounts the
    // second routinely — every revalidation re-renders the table. If unmounting
    // released by key rather than by ownership, the row disappearing would
    // re-arm the button whose send is still counting down.
    //
    // Awaited, not synchronous: the release runs off a promise, so asserting
    // straight after the unmount passes whether or not the guard is there.
    const key = "consent-request:ownership";
    const button = renderHook(() => useDeferredSend(key));
    const twin = renderHook(() => useDeferredSend(key));
    const watcher = renderHook(() => useSendHeld(key));

    act(() => button.result.current.schedule(vi.fn(), "Sending…"));
    await act(async () => {
      twin.unmount();
    });

    expect(watcher.result.current).toBe(true);
  });

  it("keeps the hold to itself when no key is given", () => {
    // Actions only one control offers — a delete, a status change — carry no
    // key and must not start colliding with each other.
    const button = renderHook(() => useDeferredSend());
    const watcher = renderHook(() => useSendHeld(undefined));

    act(() => button.result.current.schedule(vi.fn(), "Deleting…"));
    expect(watcher.result.current).toBe(false);
  });
});
