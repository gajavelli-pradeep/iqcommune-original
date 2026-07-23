"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A figure that counts up to itself when it first comes into view.
 *
 * Two rules shape this more than the animation does:
 *
 * **The number is never produced by JavaScript.** `value` is rendered as given,
 * on the server, so a blocked bundle or a script error leaves "12+" and not a
 * "0" counting to nothing. The animation only ever *lowers* the figure it
 * already shows and walks it back up — decoration over correct content, which
 * is the opposite of the usual counter that starts at zero in the markup.
 *
 * **Motion is opt-in.** Under `prefers-reduced-motion: reduce` nothing runs and
 * the figure simply is what it is. That is the right reduced-motion behaviour
 * for a number: there is nothing to convey by moving it.
 *
 * A screen reader is unaffected either way — the text changes, but with no
 * `aria-live` region nothing is announced, so it reads the settled value.
 */

/** `useLayoutEffect` warns when it runs during SSR; on the server there is no paint to beat. */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

const DURATION_MS = 1100;

/** Splits "12+" into 12 and "+", "6" into 6 and "". */
function parse(value: string): { target: number; suffix: string } | null {
  const match = value.match(/^(\d+)(\D*)$/);
  if (!match) return null;
  return { target: Number(match[1]), suffix: match[2] };
}

/**
 * One gate, consulted by both effects — and that is the point.
 *
 * They were guarded separately, so an environment with no IntersectionObserver
 * still ran the seed, dropped the figure to 0, and then had no way to animate
 * it back. The number sat at zero: exactly the "content depends on JS" failure
 * the seeding exists to prevent. Anything that stops the animation must stop
 * the seed, so the two questions are asked in one place.
 */
function canAnimate(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof IntersectionObserver === "undefined") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  // Seeded with the final value: this is what the server renders and what a
  // visitor without JavaScript keeps.
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  // Primitives, so the effects below depend on the numbers rather than on an
  // object rebuilt every render.
  const parsed = parse(value);
  const target = parsed?.target ?? null;
  const suffix = parsed?.suffix ?? "";

  // Dropping to the start value happens before the browser paints, so the
  // figure is never seen jumping from 12 to 0 and back.
  useBeforePaint(() => {
    if (target === null || !canAnimate()) return;
    setDisplay(`0${suffix}`);
  }, [target, suffix]);

  useEffect(() => {
    if (target === null || !canAnimate()) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    // Null, not 0: `start ||= now` looks equivalent and silently fails when the
    // first frame's timestamp IS 0 — which is what a browser passes for a frame
    // right after load. start would re-latch every frame, progress would stay
    // at 0, and the number would sit there never counting.
    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      // Ease-out cubic: fast enough to feel responsive, settling rather than
      // stopping dead on the final number.
      const progress = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(`${Math.round(eased * target)}${suffix}`);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    // Only counts when it is actually on screen — the hero card is above the
    // fold on a desktop and well below it on a phone, and a number that
    // finished animating before anyone scrolled to it animated for nobody.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    // No setState here. Restoring the figure on teardown looks prudent and is
    // wrong: on unmount there is nothing left to set, and React says so
    // ("Cannot update an unmounted root"). If the value changes instead, the
    // effect above re-seeds and the count runs again from the new number.
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, suffix]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
