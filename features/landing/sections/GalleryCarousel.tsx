"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The "Sessions in the room" carousel — a faithful clone of the V7 slider:
 * 320px slides (12px gap) that advance one at a time, a clamped offset so the
 * last frame sits flush, circular prev/next buttons and one dot per slide.
 *
 * V7 auto-advances every 4.5s. Autoplay here is gated on
 * prefers-reduced-motion and pauses on hover/focus (WCAG 2.2.2) — the buttons
 * and dots remain the manual control at all times.
 */

const SLIDE_W = 332; // 320px slide + 12px gap
const VISIBLE = 3;
const AUTOPLAY_MS = 4500;

export type GallerySlide = {
  /**
   * Identity, and the React key.
   *
   * The caption used to serve as the key, which held only while every caption
   * happened to differ. Two photos published under the same one — easily done,
   * and likelier still while someone is testing — collide, and React drops or
   * duplicates a slide rather than rendering both.
   */
  id: string;
  caption: string;
  city?: string;
  url?: string;
  /**
   * The artwork already prints this caption, so the overlay bar is skipped —
   * two bars in the same corner render as one smudge. Only the illustrative
   * placeholders set it; a published photo is never captioned in the pixels.
   */
  captionInArt?: boolean;
};

export function GalleryCarousel({ slides }: { slides: readonly GallerySlide[] }) {
  const total = slides.length;
  const maxIndex = Math.max(0, total - VISIBLE);
  const [current, setCurrent] = useState(0);
  const paused = useRef(false);

  const offset = Math.min(current, maxIndex) * SLIDE_W;
  const goTo = (i: number) => setCurrent(((i % total) + total) % total);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!reduce || reduce.matches) return;
    const timer = setInterval(() => {
      if (!paused.current) setCurrent((c) => ((c + 1) % total + total) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <div
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <div className="relative overflow-hidden">
        <ul
          className="flex gap-3 px-8 pb-8 transition-transform duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {/* Hovering a slide already pauses the carousel (the handlers above),
              so the card answers with a slow push-in and a warmer edge — it
              makes the pause read as deliberate rather than as the animation
              stalling.

              Only `transform` and colour move, both compositor-cheap. Gated on
              a real hover pointer, since a touch device leaves a card stuck in
              the hovered state after a tap, and on `motion-safe`, so a
              reduced-motion visitor keeps the border and loses the zoom.
              Nothing here is a control, so there is no focus state to pair
              with — the arrows and dots below own the keyboard path. */}
          {slides.map((slide) => (
            <li
              key={slide.id}
              className="group relative aspect-[4/3] w-80 shrink-0 overflow-hidden rounded-[10px] border border-on-dark-divider bg-gallery-slide transition-colors duration-300 [@media(hover:hover)]:hover:border-gold/40"
            >
              {slide.url ? (
                <Image
                  src={slide.url}
                  alt={slide.caption}
                  fill
                  sizes="320px"
                  className="object-cover transition-transform duration-500 ease-out motion-safe:[@media(hover:hover)]:group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.2}
                    aria-hidden
                    focusable="false"
                    className="text-gold opacity-30"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
              {/* Both sit on a photo, so both carry their own backing. The
                  caption had one and the city did not — white at 20% alpha
                  straight onto the image, which computes to about 1.1:1 on a
                  bright photo and simply is not there. Nothing about the type
                  could fix that: the contrast is against whatever the
                  photographer pointed the camera at.

                  Full white on a 65%-opaque chip clears AA against any photo
                  underneath — roughly 6:1 even over a near-white one. */}
              {slide.captionInArt ? null : (
                <p className="absolute inset-x-2.5 top-2.5 rounded-sm bg-gallery-slide/65 px-2.5 py-[5px] text-xs font-medium leading-[1.35] text-surface">
                  {slide.caption}
                </p>
              )}
              {slide.city ? (
                <p className="absolute right-2.5 bottom-2.5 rounded-sm bg-gallery-slide/65 px-2 py-[3px] text-2xs font-medium text-surface">
                  {slide.city}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center gap-4 bg-gallery-bg px-8 pt-5 pb-10">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          aria-label="Previous photos"
          className="tap-44 flex h-9 w-9 items-center justify-center rounded-full border border-tool-edge text-on-dark-muted transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden focusable="false">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === current}
              className={`tap-44 h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                i === current ? "w-[18px] bg-gold" : "w-1.5 bg-surface/15 hover:bg-surface/30"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label="Next photos"
          className="tap-44 flex h-9 w-9 items-center justify-center rounded-full border border-tool-edge text-on-dark-muted transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden focusable="false">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
