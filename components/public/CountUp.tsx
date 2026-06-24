"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a stat from 0 up to its target with an ease-out curve the first time it
 * scrolls into view. Accepts values like "12+", "20+", or "6" — the numeric part
 * animates and any suffix ("+", "%", "k") is preserved. Honours
 * prefers-reduced-motion by showing the final value immediately.
 */
export function CountUp({
  value,
  durationMs = 1400,
}: {
  value: string;
  durationMs?: number;
}) {
  const parsed = value.match(/^(\d+)(.*)$/);
  const target = parsed ? parseInt(parsed[1], 10) : 0;
  const suffix = parsed ? parsed[2] : "";

  // Start at "0<suffix>" so the count is visible from the first frame (no flash to
  // the final value first). Non-numeric values render verbatim.
  const [display, setDisplay] = useState(parsed ? `0${suffix}` : value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let started = false;

    const animate = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setDisplay(`${Math.round(eased * target)}${suffix}`);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          animate();
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // target/suffix derive from value; depend on the primitives only (no array).
  }, [value, target, suffix, durationMs]);

  return <span ref={ref}>{display}</span>;
}
