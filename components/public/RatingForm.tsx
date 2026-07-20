"use client";

import { useState } from "react";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below average",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid rgba(15,17,23,0.10)",
  borderRadius: 14,
  padding: "2rem 2.25rem",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 2rem 4rem" }}>
      <div style={panelStyle}>{children}</div>
    </div>
  );
}

// V6: the rating page is two stacked cards (details, then the rating form).
function CardStack({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 2rem 4rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {children}
    </div>
  );
}

// V6 star: outlined SVG polygon (empty = border-strong stroke, filled = gold fill /
// gold-dark stroke). Project rule: SVG fill/stroke must be set via `style`, not attrs.
function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={40}
      height={40}
      aria-hidden
      style={{
        display: "block",
        strokeWidth: 1.5,
        transition: "fill 150ms ease, stroke 150ms ease",
        fill: filled ? "var(--gold)" : "none",
        stroke: filled ? "var(--gold-dark)" : "var(--border-strong)",
      }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="rating-stars"
      role="radiogroup"
      aria-label="Rate out of 5"
      style={{ display: "flex", gap: 10, justifyContent: "center", margin: "6px 0 4px" }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""} — ${RATING_LABELS[star]}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(star)}
          onBlur={() => setHover(0)}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            lineHeight: 0,
            transition: "transform 120ms ease",
            transform: hover === star ? "scale(1.12)" : "scale(1)",
          }}
        >
          <StarSvg filled={star <= active} />
        </button>
      ))}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

export function RatingForm({
  refCode,
  token,
  practitionerName,
  module,
  sessionDate,
  city,
  requestedBy,
  alreadyRated,
}: {
  refCode: string;
  token: string;
  practitionerName: string;
  module: string | null;
  sessionDate: string | null;
  city: string | null;
  requestedBy: string | null;
  alreadyRated: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [doneRating, setDoneRating] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState("");

  const date = fmtDate(sessionDate);

  if (alreadyRated) {
    return (
      <Card>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Rating already submitted</h1>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6 }}>
          A rating for this session has already been recorded. Thank you — there&apos;s nothing more to do.
        </p>
      </Card>
    );
  }

  if (doneRating != null) {
    return (
      <Card>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-light)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <svg width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginTop: 12 }}>Thank you for your feedback</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 6, lineHeight: 1.6 }}>
            We&apos;ve recorded your rating — it genuinely helps us keep quality high across the network.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem", background: "var(--surface-soft)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "1rem 1.1rem" }}>
          <KV label="Practitioner" value={practitionerName} />
          <KV label="Session" value={module ? `${refCode} · ${module}` : refCode} />
          <KV label="Your rating" value={`${doneRating} / 5 — ${RATING_LABELS[doneRating]}`} />
          <KV label="Submitted at" value={submittedAt} />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 14, lineHeight: 1.6, textAlign: "center" }}>
          If you&apos;d like to share more, just reply to the email this link was sent from.
        </p>
      </Card>
    );
  }

  async function submit() {
    if (rating < 1) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, rating, comments: comments.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmittedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      setDoneRating(rating);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardStack>
      <div style={panelStyle}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>How was your session?</h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Your feedback helps us maintain quality across our practitioner network — it takes less than a minute.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem 1.2rem" }}>
          <KV label="Practitioner" value={practitionerName} />
          <KV label="Module" value={module ?? "—"} />
          <KV label="Session date" value={date ?? "—"} />
          <KV label="City" value={city ?? "—"} />
          <KV label="Session ref." value={refCode} />
          <KV label="Requested by" value={requestedBy ?? "—"} />
        </div>
      </div>

      <div style={panelStyle}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", textAlign: "center", marginBottom: 4 }}>
        Rate the practitioner out of 5
      </div>
      <StarRow value={rating} onChange={setRating} />
      <div style={{ textAlign: "center", fontSize: 13.5, fontWeight: 500, color: rating ? "var(--gold-dark)" : "var(--ink-faint)", minHeight: 20, marginBottom: 18 }}>
        {rating ? `${rating} — ${RATING_LABELS[rating]}` : "Tap a star to rate"}
      </div>

      <label htmlFor="rating-comments" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", marginBottom: 6 }}>
        Anything you&apos;d like to add? (optional)
      </label>
      <textarea
        id="rating-comments"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Any specific feedback about the session or the practitioner..."
        style={{
          width: "100%",
          border: "1px solid var(--border-input)",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 14,
          fontFamily: "inherit",
          color: "var(--ink)",
          background: "var(--surface-soft)",
          resize: "vertical",
        }}
      />
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.55 }}>
        This is shared internally with iqcommune only — not with the practitioner directly.
      </p>

      {error && (
        <div role="alert" style={{ fontSize: 13, color: "var(--red)", background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "8px 11px", marginTop: 12 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={saving || rating < 1}
        style={{
          marginTop: 18,
          width: "100%",
          // V6: ink submit button; disabled (no star yet / saving) drops to opacity 0.4.
          background: "var(--ink)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: rating < 1 || saving ? "not-allowed" : "pointer",
          opacity: rating < 1 || saving ? 0.4 : 1,
          minHeight: 44,
        }}
      >
        {saving ? "Submitting…" : "Submit rating"}
      </button>
      </div>
    </CardStack>
  );
}
