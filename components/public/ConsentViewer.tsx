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
  // V4 parity fields — optional because confirmations generated before this
  // change carry the older, smaller snapshot. Render with a "—" fallback.
  firstName?: string;
  agreementRef?: string;
  issuedOn?: string;
  startTime?: string;
  duration?: string;
  city?: string;
  state?: string;
  audience?: string;
  spoc?: string;
  invoiceBy?: string;
  paymentMethod?: string;
}

const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const dash = (s: string | undefined | null) => (s && String(s).trim() ? String(s) : "—");

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,0.12)",
  borderRadius: 14,
  padding: "1.75rem 1.9rem",
  marginBottom: "1.25rem",
};
const cardTitle: React.CSSProperties = { fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 6 };
const cardSub: React.CSSProperties = { fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: "1.5rem" };
const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--gold-dark)",
  margin: "1.5rem 0 0.85rem",
};
const kvLabel: React.CSSProperties = { fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 2 };
const kvValue: React.CSSProperties = { fontSize: 14.5, fontWeight: 500, color: "var(--ink)" };
const divider: React.CSSProperties = { height: 1, background: "rgba(20,18,12,0.10)", margin: "1.5rem 0" };
const note: React.CSSProperties = { fontSize: 12.5, color: "var(--ink-muted)", fontStyle: "italic", marginTop: "0.5rem" };

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={kvLabel}>{label}</div>
      <div style={kvValue}>{value}</div>
    </div>
  );
}

function CheckIcon({ size = 15, stroke = "var(--gold-dark)" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke, flexShrink: 0 }} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const CONSENT_ITEMS = [
  "I have reviewed all session details and the confirmed payout amount above and confirm they are correct.",
  "I agree to deliver the session as described and accept the payout amount stated.",
  "I confirm the tax invoice should be raised in the name specified above.",
  "I understand this confirmation is specific to this session only and does not alter my empanelment agreement.",
];

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
  const [consentTs, setConsentTs] = useState("");
  const [error, setError] = useState("");

  const firstName = dash(snapshot.firstName ?? snapshot.practitionerName.split(" ")[0]);
  const cityState = [snapshot.city, snapshot.state].filter((s) => s && s.trim()).join(", ") || "—";
  const gstDisplay = snapshot.gstRate > 0 ? `${snapshot.gstRate}%` : "No";

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
      const ts = new Date();
      setConsentTs(
        ts.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) +
          "  " +
          ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setDone(true);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
      {/* Details */}
      <div style={card}>
        <div style={cardTitle}>Confirm your session details</div>
        <div style={cardSub}>
          Please review everything below carefully. Your consent confirms acceptance of this session and the stated payout.
        </div>

        <div className="kv-grid-2">
          <KV label="Confirmation Ref. No." value={dash(refCode)} />
          <KV label="Empanelment Agreement Ref." value={dash(snapshot.agreementRef)} />
          <KV label="Issued On" value={dash(snapshot.issuedOn)} />
          <KV label="First Name" value={firstName} />
        </div>

        <div style={sectionLabel}>Session details</div>
        <div className="kv-grid-2">
          <KV label="Module confirmed for" value={dash(snapshot.module)} />
          <KV label="Date" value={dash(snapshot.date)} />
          <KV label="Start time" value={dash(snapshot.startTime ?? snapshot.time)} />
          <KV label="Duration" value={dash(snapshot.duration)} />
          <KV label="Venue" value={dash(snapshot.venue)} />
          <KV label="City, State" value={cityState} />
          <KV label="Audience type" value={dash(snapshot.audience)} />
          <KV label="Participants" value={String(snapshot.participants)} />
          <KV label="SPOC name" value={dash(snapshot.spoc)} />
        </div>

        <div style={divider} />

        <div style={{ ...sectionLabel, marginTop: 0 }}>Payout confirmation</div>
        <div className="kv-grid-2">
          <KV label="Gross payout amount" value={rupee(snapshot.gross)} />
          <KV label="TDS applicable" value={`${snapshot.tdsRate}% deducted`} />
          <KV label="GST applicable" value={gstDisplay} />
          <KV label="Payment TAT" value="+7 working days from invoice receipt" />
        </div>
        <div
          style={{
            background: "var(--green-light, #eef7ee)",
            borderRadius: 8,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            margin: "1rem 0",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--green, #2a6b2a)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Net payout amount
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
              This reflects the group size committed by the client — not reduced if actual attendance is lower.
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--green, #2a6b2a)" }}>{rupee(snapshot.net)}</div>
        </div>

        <div style={sectionLabel}>Tax invoice details</div>
        <div className="kv-grid-2">
          <KV label="Invoice should be raised by" value={dash(snapshot.invoiceBy)} />
          <KV label="Payment method on file" value={dash(snapshot.paymentMethod)} />
        </div>
        <div style={note}>You are responsible for raising this invoice — iqcommune does not raise it on your behalf.</div>
      </div>

      {/* Consent action */}
      {!done && (
        <div style={card}>
          <div style={{ background: "var(--surface-soft)", borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: "0.85rem" }}>
              Your consent is required to confirm this session
            </div>
            {CONSENT_ITEMS.map((item) => (
              <div key={item} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.55, marginBottom: 8 }}>
                <span style={{ marginTop: 3 }}>
                  <CheckIcon />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <label style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.6, cursor: "pointer", marginBottom: "1rem" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--gold-dark)", flexShrink: 0, cursor: "pointer" }}
            />
            <span>I confirm the above and provide my digital consent to this session.</span>
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

          {error && <p role="alert" style={{ fontSize: 13, color: "var(--red, #a32d2d)", marginBottom: "0.85rem" }}>{error}</p>}

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
              borderRadius: 10,
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

      {/* Success */}
      {done && (
        <div style={{ ...card, textAlign: "center" }} role="status">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--green-light, #eef7ee)",
              color: "var(--green, #2a6b2a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <CheckIcon size={26} stroke="var(--green, #2a6b2a)" />
          </div>
          <div style={{ ...cardTitle, marginBottom: 6 }}>Consent recorded</div>
          <div style={{ ...cardSub, marginBottom: 0 }}>
            Thank you — your session is now fully confirmed. iqcommune has been notified.
          </div>
          {consentTs && (
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", fontFamily: "monospace", marginTop: "0.75rem" }}>
              Digital consent timestamp: {consentTs}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-faint)", marginTop: "2rem" }}>
        Confidential · Questions? Reply to the email this link was sent from, or write to{" "}
        <a href="mailto:hello@iqcommune.com" style={{ color: "var(--gold-dark)", textDecoration: "none" }}>
          hello@iqcommune.com
        </a>
      </div>
    </div>
  );
}
