import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountUp } from "./CountUp";

/**
 * The behaviour worth pinning is not the easing — it is that the figure is
 * correct in every situation where the animation does not run: no JavaScript,
 * reduced motion, never scrolled into view, unmounted mid-count. A counter that
 * strands a "0" on the page is worse than no counter.
 */

let observed: (() => void) | null = null;

beforeEach(() => {
  observed = null;
  // jsdom has neither, and their absence is what the component guards against.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private cb: (entries: { isIntersecting: boolean }[]) => void) {
        observed = () => this.cb([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }),
  );

describe("CountUp", () => {
  it("renders the real figure when motion is not welcome", () => {
    reducedMotion(true);
    render(<CountUp value="12+" />);
    expect(screen.getByText("12+")).toBeInTheDocument();
  });

  it("holds at the start value until it is actually on screen", () => {
    reducedMotion(false);
    render(<CountUp value="20+" />);
    // Observer has not fired: nothing has been scrolled to yet.
    expect(screen.getByText("0+")).toBeInTheDocument();
  });

  it("keeps the suffix through the count", () => {
    reducedMotion(false);
    render(<CountUp value="12+" />);
    expect(screen.getByText(/\+$/)).toBeInTheDocument();
  });

  it("lands exactly on the target, not near it", () => {
    reducedMotion(false);
    // A queue rather than an immediate call: the loop schedules its next frame
    // from inside the callback, so invoking it synchronously recurses forever.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});

    render(<CountUp value="12+" />);
    act(() => observed?.());

    // First frame fixes the start time; the second is far past the end, which
    // is where rounding an eased curve would otherwise leave it on 11.
    act(() => frames.shift()?.(0));
    act(() => frames.shift()?.(99_000));

    expect(screen.getByText("12+")).toBeInTheDocument();
  });

  it("tears down without React complaining about an unmounted root", () => {
    reducedMotion(false);
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(String(args[0]));
    });

    const { unmount } = render(<CountUp value="6" />);
    observed?.();
    unmount();

    expect(errors.filter((e) => /unmounted/i.test(e))).toEqual([]);
    spy.mockRestore();
  });

  it("leaves a figure it cannot parse completely alone", () => {
    reducedMotion(false);
    render(<CountUp value="Pan-India" />);
    expect(screen.getByText("Pan-India")).toBeInTheDocument();
  });

  it("shows the true figure where IntersectionObserver does not exist", () => {
    // The regression this pins: the seed and the animation were gated
    // separately, so a browser without IntersectionObserver dropped the figure
    // to 0 and had nothing left to count it back up. Twelve tests failed on it,
    // because jsdom is one such environment.
    reducedMotion(false);
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<CountUp value="12+" />);
    expect(screen.getByText("12+")).toBeInTheDocument();
  });
});
