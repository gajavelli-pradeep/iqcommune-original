"use client";

import { useState, useEffect, useCallback } from "react";

interface ExistingFeedback {
  id: string;
  overall_rating: number | null;
  subsections?: Record<string, number> | null;
  comments?: string | null;
  collected_by?: string | null;
}

interface FeedbackModalProps {
  sessionId: string;
  sessionRef: string;
  practitionerName: string;
  existing?: ExistingFeedback | null;
  onClose: () => void;
  onSaved: (result: { id: string; overall_rating: number | null }) => void;
}

const SUBSECTION_LABELS: Record<string, string> = {
  content:    "Content quality",
  delivery:   "Delivery",
  engagement: "Audience engagement",
  logistics:  "Logistics & setup",
};

function StarPicker({
  value,
  onChange,
  size = 28,
}: {
  value: number | null;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star)}
          style={{
            background: "none",
            border: "none",
            padding: "0 1px",
            cursor: "pointer",
            color: active !== null && star <= active ? "var(--gold)" : "rgba(20,18,12,.20)",
            fontSize: size,
            lineHeight: 1,
          }}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function FeedbackModal({
  sessionId,
  sessionRef,
  practitionerName,
  existing,
  onClose,
  onSaved,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(existing?.overall_rating ?? null);
  const [subsections, setSubsections] = useState<Record<string, number | null>>({
    content:    existing?.subsections?.content    ?? null,
    delivery:   existing?.subsections?.delivery   ?? null,
    engagement: existing?.subsections?.engagement ?? null,
    logistics:  existing?.subsections?.logistics  ?? null,
  });
  const [showSubsections, setShowSubsections] = useState(
    Object.values(existing?.subsections ?? {}).some((v) => v != null)
  );
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [collectedBy, setCollectedBy] = useState(existing?.collected_by ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const save = async () => {
    setSaving(true);
    setError("");

    const subPayload = showSubsections
      ? Object.fromEntries(
          Object.entries(subsections).filter(([, v]) => v != null) as [string, number][]
        )
      : null;

    const body = {
      overall_rating: rating,
      subsections:    Object.keys(subPayload ?? {}).length > 0 ? subPayload : null,
      comments:       comments.trim() || null,
      collected_by:   collectedBy.trim() || null,
    };

    const method = existing ? "PATCH" : "POST";
    const res = await fetch(`/api/admin/sessions/${sessionId}/feedback`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Failed to save feedback");
      setSaving(false);
      return;
    }

    const result = (await res.json()) as { id: string; overall_rating: number | null };
    onSaved(result);
    onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,18,12,.55)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(20,18,12,.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid rgba(20,18,12,.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              {existing ? "Edit feedback" : "Add feedback"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2, fontFamily: "monospace" }}>
              {sessionRef} · {practitionerName}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--ink-faint)",
              display: "flex",
              borderRadius: 6,
            }}
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Overall rating */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
              Overall rating (out of 5)
            </label>
            <StarPicker value={rating} onChange={setRating} size={32} />
            {rating !== null && (
              <span style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4, display: "block" }}>
                {rating} / 5
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  clear
                </button>
              </span>
            )}
          </div>

          {/* Optional subsections */}
          <div>
            <button
              type="button"
              onClick={() => setShowSubsections((s) => !s)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: 12,
                color: "var(--gold-dark)",
                fontWeight: 600,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                fill="currentColor"
                style={{ transform: showSubsections ? "rotate(90deg)" : undefined, transition: "transform .15s" }}
                aria-hidden="true"
              >
                <path d="M3 2l4 3-4 3V2z" />
              </svg>
              {showSubsections ? "Hide" : "Add"} subsection ratings (optional)
            </button>

            {showSubsections && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(SUBSECTION_LABELS).map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)", minWidth: 160 }}>{label}</span>
                    <StarPicker
                      value={subsections[key] ?? null}
                      onChange={(v) => setSubsections((prev) => ({ ...prev, [key]: v }))}
                      size={20}
                    />
                    {subsections[key] != null && (
                      <button
                        type="button"
                        onClick={() => setSubsections((prev) => ({ ...prev, [key]: null }))}
                        style={{ fontSize: 10, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <label
              htmlFor="feedback-comments"
              style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}
            >
              Comments <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(optional)</span>
            </label>
            <textarea
              id="feedback-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Organizer's notes, strengths, areas to improve…"
              style={{
                width: "100%",
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(20,18,12,.15)",
                background: "var(--input-paper)",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                color: "var(--ink)",
              }}
            />
          </div>

          {/* Collected by */}
          <div>
            <label
              htmlFor="feedback-collected-by"
              style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}
            >
              Collected by <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(optional)</span>
            </label>
            <input
              id="feedback-collected-by"
              type="text"
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              maxLength={200}
              placeholder="Admin name or contact"
              style={{
                width: "100%",
                fontSize: 13,
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid rgba(20,18,12,.15)",
                background: "var(--input-paper)",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                color: "var(--ink)",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", background: "rgba(163,45,45,.07)", borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid rgba(20,18,12,.10)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: "rgba(20,18,12,.07)",
              color: "var(--ink)",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              cursor: saving ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? "rgba(20,18,12,.20)" : "#c9982a",
              color: "#14161d",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : existing ? "Update" : "Save feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
