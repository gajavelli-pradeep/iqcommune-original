"use client";

import { useState } from "react";

export interface ConfSnapshot {
  practitionerName: string;
  sessionRef: string;
  module: string;
  date: string;
  time: string;
  venue: string;
  participants: number;
  gross: number;
  tdsRate: number;
  tdsAmount: number;
  gstRate: number;
  gstAmount: number;
  net: number;
}

const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,0.12)",
  borderRadius: 14,
  padding: "1.5rem 1.75rem",
  marginBottom: "1.25rem",
};
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gold-dark)",
  marginBottom: "0.85rem",
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "7px 0",
        fontSize: strong ? 15 : 13.5,
        fontWeight: strong ? 600 : 400,
        color: strong ? "var(--ink)" : "var(--ink-muted)",
        borderTop: strong ? "1px solid rgba(20,18,12,0.12)" : "none",
        marginTop: strong ? 6 : 0,
      }}
    >
      <span>{label}</span>
      <span style={{ color: "var(--ink)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function ConsentViewer({
  refCode,
  token,
  status,
  snapshot,
}: {
  refCode: string;
  token: string;
  status: string;
  snapshot: ConfSnapshot;
}) {
  const already = status === "Consent received";
  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(already);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!agreed || typedName.trim().length < 2) return;
    setSubmitting(true);
    let res: Response;
    try {
      res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, signatureMethod: "typed", signatureData: typedName.trim() }),
      });
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
      return;
    }
    if (res.ok) {
      setDone(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 6 }}>
          Session revenue confirmation
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6 }}>
          Please review the details below and provide your consent before the session is confirmed. Reference {refCode}.
        </p>
      </div>

      {done && (
        <div
          role="status"
          style={{
            background: "var(--green-light, #eef7ee)",
            border: "1px solid var(--green-border, #bcdcbc)",
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--green, #2a6b2a)", flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>
            <strong>Consent recorded.</strong> Thank you — your revenue confirmation for this session is complete. No further action is needed.
          </div>
        </div>
      )}

      {/* Practitioner + session */}
      <div style={card}>
        <div style={sectionLabel}>Session details</div>
        <Row label="Practitioner" value={snapshot.practitionerName} />
        <Row label="Session reference" value={snapshot.sessionRef} />
        <Row label="Module" value={snapshot.module} />
        <Row label="Date" value={snapshot.date} />
        <Row label="Time" value={snapshot.time} />
        <Row label="Venue" value={snapshot.venue} />
        <Row label="Participants" value={String(snapshot.participants)} />
      </div>

      {/* Payout */}
      <div style={card}>
        <div style={sectionLabel}>Your payout</div>
        <Row label="Gross amount" value={rupee(snapshot.gross)} />
        <Row label={`Less: TDS (${snapshot.tdsRate}%)`} value={`− ${rupee(snapshot.tdsAmount)}`} />
        <Row label={`Add: GST (${snapshot.gstRate}%)`} value={`+ ${rupee(snapshot.gstAmount)}`} />
        <Row label="Net payout" value={rupee(snapshot.net)} strong />
      </div>

      {/* Consent action */}
      {!done && (
        <div style={{ ...card, background: "var(--surface-soft)" }}>
          <div style={sectionLabel}>Provide consent</div>
          <label style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.6, cursor: "pointer", marginBottom: "1rem" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--gold)", flexShrink: 0, cursor: "pointer" }}
            />
            <span>
              I confirm the session and payout details above are correct, and I consent to delivering this session on the terms shown. I understand the net payout is calculated as gross × (1 − TDS% + GST%).
            </span>
          </label>

          <label htmlFor="consent-name" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 5 }}>
            Type your full name to sign
          </label>
          <input
            id="consent-name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={snapshot.practitionerName}
            autoComplete="name"
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "1.5px solid rgba(20,18,12,0.16)",
              borderRadius: 9,
              fontSize: 14,
              fontFamily: "inherit",
              background: "var(--input-paper)",
              color: "var(--ink)",
              boxSizing: "border-box",
              marginBottom: "1rem",
            }}
          />

          {error && (
            <p role="alert" style={{ fontSize: 13, color: "var(--red, #a32d2d)", marginBottom: "0.85rem" }}>{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!agreed || typedName.trim().length < 2 || submitting}
            style={{
              width: "100%",
              minHeight: 48,
              background: "var(--ink)",
              color: "#fff",
              border: "none",
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: !agreed || typedName.trim().length < 2 || submitting ? "not-allowed" : "pointer",
              opacity: !agreed || typedName.trim().length < 2 || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Recording…" : "Provide consent"}
          </button>
        </div>
      )}
    </div>
  );
}
