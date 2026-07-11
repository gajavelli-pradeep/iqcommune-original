"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";

// Fallback placeholders — shown until an admin publishes real photos (managed in
// the console Gallery tab → GET /api/gallery). Real photos carry the two overlay
// captions: topLeft (full-sentence caption, shown as a top badge) + bottomRight (city).
const PLACEHOLDERS = [
  { label: "From the back of the room", sub: "Trainer in focus, audience visible", topLeft: "Deep in a foundations session", bottomRight: null as string | null },
  { label: "Audience in focus", sub: "Trainer's perspective, room engaged", topLeft: "Full house for equity investing", bottomRight: "Mumbai" },
  { label: "Group photo", sub: "End of session", topLeft: "Wrapping up a portfolio strategy session", bottomRight: null },
  { label: "Candid — mid session", sub: "Numbers being worked through", topLeft: "Working through the retirement numbers", bottomRight: "Bengaluru" },
  { label: "Front-left corner view", sub: "Full room, wide angle", topLeft: "A packed asset-allocation workshop", bottomRight: null },
  { label: "Candid — Q&A moment", sub: "Participant raising a question", topLeft: "Great question from the back row", bottomRight: "Pune" },
  { label: "Front-right corner view", sub: "Trainer and board visible", topLeft: "Every seat taken for the basics", bottomRight: "Delhi" },
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

  // Real published photos if any, else placeholders.
  const slides: Slide[] = photos && photos.length > 0 ? photos : PLACEHOLDERS;
  const total = slides.length;
  const maxOffset = Math.max(0, total - VISIBLE);

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
      trackRef.current.style.transform = `translateX(-${Math.min(idx, maxOffset) * STEP}px)`;
    }
  }, [maxOffset]);

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

  const nav = (dir: -1 | 1) => {
    goTo(current + dir);
    startAuto();
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
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div
          ref={trackRef}
          style={{ display: "flex", gap: SLIDE_GAP, padding: "0 2rem 2rem", transition: "transform 0.5s cubic-bezier(0.25,0.8,0.25,1)" }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                flex: `0 0 ${SLIDE_W}px`,
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
                <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 10, color: slide.url ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)", textShadow: slide.url ? "0 1px 3px rgba(0,0,0,0.6)" : undefined }}>
                  {slide.bottomRight}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, padding: "1.25rem 2rem 2.5rem", background: "#0a0a0a" }}>
        <button
          onClick={() => nav(-1)}
          aria-label="Previous slide"
          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        <div style={{ display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i); startAuto(); }}
              aria-label={`Go to slide ${i + 1}`}
              style={{ width: current === i ? 18 : 6, height: 6, borderRadius: current === i ? 3 : "50%", background: current === i ? "var(--gold)" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", padding: 0, transition: "background 0.3s, width 0.3s" }}
            />
          ))}
        </div>

        <button
          onClick={() => nav(1)}
          aria-label="Next slide"
          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
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
