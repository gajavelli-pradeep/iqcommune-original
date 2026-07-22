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
    expect(result.current.pending).toEqual({ label: "Matching…" });
    expect(commit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(15_000));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
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
