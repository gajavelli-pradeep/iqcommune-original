import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeferredSend } from "./useDeferredSend";

/**
 * The console's 15-second Undo window (procedure §114). The action must fire
 * only if the window elapses, and never if it is undone.
 */
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDeferredSend", () => {
  it("commits the action once the 15s window elapses", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Matching…"));
    expect(result.current.pending).toEqual({ label: "Matching…", secondsLeft: 15 });
    expect(commit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(15_000));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
  });

  it("counts the window down so the toast can say what is left", () => {
    // A static "15 seconds" says a window exists; it does not say whether there
    // is still time to stop it, which is the only thing being read.
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "Matching…"));
    expect(result.current.pending?.secondsLeft).toBe(15);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.pending?.secondsLeft).toBe(14);

    act(() => vi.advanceTimersByTime(9_000));
    expect(result.current.pending?.secondsLeft).toBe(5);

    // The label is carried through untouched — only the number moves.
    expect(result.current.pending?.label).toBe("Matching…");
  });

  it("restarts the count when a second send supersedes the first", () => {
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "First…"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.pending?.secondsLeft).toBe(5);

    act(() => result.current.schedule(vi.fn(), "Second…"));
    expect(result.current.pending).toEqual({ label: "Second…", secondsLeft: 15 });
  });

  it("stops ticking once the window closes", () => {
    // The interval outliving the timeout would leave a toast counting past
    // zero, or a stray timer running after the component is gone.
    const { result, unmount } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(vi.fn(), "Matching…"));
    act(() => vi.advanceTimersByTime(15_000));
    expect(result.current.pending).toBeNull();

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.pending).toBeNull();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not commit if undone within the window", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredSend());

    act(() => result.current.schedule(commit, "Deactivating…"));
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.undo());
    act(() => vi.advanceTimersByTime(10_000));

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
    act(() => vi.advanceTimersByTime(15_000));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
