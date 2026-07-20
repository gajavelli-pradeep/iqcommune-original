"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";

// Fallback placeholders — shown until an admin publishes real photos (managed in
// the console Gallery tab → GET /api/gallery). Real photos carry the two overlay
// captions: topLeft (full-sentence caption, shown as a top badge) + bottomRight (city).
const PLACEHOLDERS = [
  { label: "From the back of the room", sub: "Trainer in focus, audience visible", topLeft: "Deep in a foundations session", bottomRight: null as string | null },
  { label: "Audience in focus", sub: "Trainer's perspective, room engaged", topLeft: "Full house for equity investing", bottomRight: "Mumbai" },
  { label: "Group photo", sub: "End of session", topLeft: "Wrapping up on a high note", bottomRight: null },
  { label: "Candid — mid session", sub: "Numbers being worked through", topLeft: "Working through a retirement plan", bottomRight: "Bengaluru" },
  { label: "Front-left corner view", sub: "Full room, wide angle", topLeft: "Building out a portfolio, live", bottomRight: null },
  { label: "Candid — Q&A moment", sub: "Participant raising a question", topLeft: "Great question from the back row", bottomRight: "Pune" },
  { label: "Front-right corner view", sub: "Trainer and board visible", topLeft: "Foundations, session two", bottomRight: "Delhi" },
];

interface Slide {
  url?: string;
  topLeft: string | null;
  bottomRight: string | null;
  label?: string;
  sub?: string;
}

const SLIDE_W = 320;
const SLIDE_GAP = 12;
const VISIBLE = 3;
const STEP = SLIDE_W + SLIDE_GAP;
const AUTO_DELAY = 4500;

const CameraIcon = () => (
  <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export function GallerySection() {
  const [photos, setPhotos] = useState<Slide[] | null>(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  // Real published photos if any, else placeholders.
  const slides: Slide[] = photos && photos.length > 0 ? photos : PLACEHOLDERS;
  const total = slides.length;

  // Slides are CSS-clamped to min(320px, viewport − 4rem), so on a phone each
  // slide is narrower than 320px. The transform step must match the *rendered*
  // width or paging drifts — so measure it (and how many slides fit) at runtime.
  const [step, setStep] = useState(STEP);
  const [maxOffset, setMaxOffset] = useState(Math.max(0, total - VISIBLE));

  const loadGallery = useCallback(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.photos)) {
          setPhotos(j.photos.map((p: { url: string; topLeft: string | null; bottomRight: string | null }) => ({
            url: p.url, topLeft: p.topLeft, bottomRight: p.bottomRight,
          })));
        }
      })
      .catch(() => { /* keep placeholders */ });
  }, []);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  // Live: when an admin publishes/updates a gallery photo, the public homepage
  // refreshes on its own (anon reads only published rows — see migration 0024).
  useRealtimeChannel("gallery_photos", loadGallery);

  const applyOffset = useCallback((idx: number) => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${Math.min(idx, maxOffset) * step}px)`;
    }
  }, [maxOffset, step]);

  const goTo = useCallback((idx: number) => {
    const next = ((idx % total) + total) % total;
    setCurrent(next);
    applyOffset(next);
  }, [total, applyOffset]);

  // setInterval (not recursive setTimeout) — auto-advances without a self-reference.
  const startAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % total;
        applyOffset(next);
        return next;
      });
    }, AUTO_DELAY);
  }, [total, applyOffset]);

  useEffect(() => {
    startAuto();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startAuto]);

  // Measure the rendered slide width → derive the paging step + visible count.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const vp = viewportRef.current;
      const firstSlide = track?.firstElementChild as HTMLElement | null;
      if (!track || !vp || !firstSlide) return;
      const nextStep = firstSlide.offsetWidth + SLIDE_GAP;
      const visible = Math.max(1, Math.round((vp.clientWidth + SLIDE_GAP) / nextStep));
      setStep(nextStep);
      setMaxOffset(Math.max(0, total - visible));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [total]);

  // Re-clamp the current position whenever the step/limit changes (e.g. rotate).
  useEffect(() => { applyOffset(current); }, [step, maxOffset, current, applyOffset]);

  const nav = (dir: -1 | 1) => {
    goTo(current + dir);
    startAuto();
  };

  // Touch swipe: primary paging affordance on phones (arrows/dots are secondary).
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) nav(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <section style={{ background: "#0a0a0a", padding: "4rem 0 0", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: "2.5rem", padding: "0 2rem" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.5rem" }}>
          Sessions in the room
        </div>
        <div style={{ fontSize: "clamp(22px,2.8vw,30px)", fontWeight: 600, color: "#fff", lineHeight: 1.25 }}>
          Where it actually happens.
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
          Photos from sessions conducted across India — real rooms, real conversations.
        </div>
      </div>

      {/* Track */}
      <div
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div
          ref={trackRef}
          style={{ display: "flex", gap: SLIDE_GAP, padding: "0 2rem 2rem", transition: "transform 0.5s cubic-bezier(0.25,0.8,0.25,1)" }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                flex: `0 0 min(${SLIDE_W}px, calc(100vw - 4rem))`,
                borderRadius: 10,
                overflow: "hidden",
                position: "relative",
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.06)",
                aspectRatio: "4/3",
              }}
            >
              {slide.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.url} alt={slide.topLeft ?? "Session photo"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "rgba(201,152,42,0.3)" }}>
                  <CameraIcon />
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "0 1.5rem", lineHeight: 1.5 }}>
                    {slide.label}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", textAlign: "center", padding: "0 1.5rem" }}>
                    {slide.sub}
                  </div>
                </div>
              )}

              {/* V5 caption design: a full-sentence caption as a top-left translucent
                  badge, plus a faint city label bottom-right — shown over photos and
                  placeholders alike (matches the mockup's gallery-slide-caption/city). */}
              {slide.topLeft && (
                <div style={{ position: "absolute", top: 10, left: 10, right: 10, background: "rgba(26,26,26,0.55)", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                  {slide.topLeft}
                </div>
              )}
              {slide.bottomRight && (
                <div
                  style={
                    slide.url
                      // Over a real photo: same translucent-dark pill as the top-left
                      // caption, so the city stays legible over any background.
                      ? { position: "absolute", bottom: 10, right: 10, background: "rgba(26,26,26,0.55)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }
                      // Over a placeholder (dark surface): keep it ghosted, no pill.
                      : { position: "absolute", bottom: 10, right: 10, fontSize: 10, color: "rgba(255,255,255,0.2)" }
                  }
                >
                  {slide.bottomRight}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "1.25rem 1.25rem 2.5rem", background: "#0a0a0a" }}>
        <button
          onClick={() => nav(-1)}
          aria-label="Previous slide"
          style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        <div style={{ display: "flex", gap: 3 }}>
          {slides.map((_, i) => (
            // 44px-tall hit area; the gold bar is an inner span so the touch target
            // grows without the visual dot changing. (7 full 44-wide dots can't fit a
            // 320px row, so width stays compact while the height meets the floor.)
            <button
              key={i}
              onClick={() => { goTo(i); startAuto(); }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={current === i}
              style={{ height: 44, width: current === i ? 26 : 18, minHeight: 0, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ width: current === i ? 18 : 6, height: 6, borderRadius: current === i ? 3 : "50%", background: current === i ? "var(--gold)" : "rgba(255,255,255,0.15)", transition: "background 0.3s, width 0.3s" }} />
            </button>
          ))}
        </div>

        <button
          onClick={() => nav(1)}
          aria-label="Next slide"
          style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* Submit nudge */}
      <div style={{ textAlign: "center", fontSize: 12.5, color: "rgba(255,255,255,0.3)", paddingBottom: "0.5rem" }}>
        Attended a session? Share it on social media and tag{" "}
        <strong style={{ color: "rgba(255,255,255,0.55)" }}>@iqcommune</strong>{" "}
        — we feature the best ones here.
      </div>
    </section>
  );
}
