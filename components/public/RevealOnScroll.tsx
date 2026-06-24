"use client";

import { useEffect } from "react";

/**
 * Adds `.iq-visible` to every `.iq-animate` element as it scrolls into view,
 * triggering the entrance animation defined in globals.css. Renders nothing.
 * If IntersectionObserver is unavailable, all cards are revealed immediately so
 * content is never trapped behind `opacity: 0`.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".iq-animate");
    if (!cards.length) return;

    if (typeof IntersectionObserver === "undefined") {
      cards.forEach((c) => c.classList.add("iq-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("iq-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return null;
}
