"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--input-paper)",
  boxSizing: "border-box",
};
const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-soft)",
  marginBottom: 6,
  display: "block",
};

export function JoinAdminForm({ email, token, roleLabel }: { email: string; token: string; roleLabel: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [activatedAt, setActivatedAt] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/admin-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Could not create your account.");
        return;
      }
      setActivatedAt(
        new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      );
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          background: "var(--green-light)",
          border: "1px solid var(--green-border)",
          borderRadius: 10,
          padding: "1.5rem 1.25rem",
          textAlign: "center",
        }}
      >
        {/* V5 success: green circle + checkmark */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 6 }}>
          Account activated
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 14px" }}>
          Your admin account for <strong style={{ color: "var(--ink)" }}>{email}</strong> is ready.
        </p>
        {activatedAt && (
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", margin: "0 0 16px" }}>
            Activated: {activatedAt}
          </p>
        )}
        <a
          href="/login"
          style={{
            display: "inline-block",
            background: "var(--ink)",
            color: "var(--surface)",
            padding: "9px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      {/* V5 read-only invite summary (Email + Role) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "rgba(20,18,12,.10)",
          border: "1px solid rgba(20,18,12,.12)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {[
          { k: "Email", v: email },
          { k: "Role", v: roleLabel },
        ].map(({ k, v }) => (
          <div key={k} style={{ background: "var(--surface-soft)", padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 3 }}>
              {k}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", wordBreak: "break-word" }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label style={label} htmlFor="ja-name">Your name</label>
        <input
          id="ja-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="e.g. Priya Sharma"
          autoFocus
          autoComplete="name"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={label} htmlFor="ja-pw">Create a password</label>
        <div style={{ position: "relative" }}>
          <input
            id="ja-pw"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            style={{ ...inputStyle, paddingRight: 64 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", fontFamily: "inherit",
            }}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label style={label} htmlFor="ja-confirm">Confirm password</label>
        <input
          id="ja-confirm"
          type={showPw ? "text" : "password"}
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          style={inputStyle}
        />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "var(--red-light)",
            border: "1px solid var(--red-border)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: "var(--ink)",
          color: "var(--surface)",
          border: "none",
          borderRadius: 8,
          padding: "11px",
          fontSize: 14,
          fontWeight: 600,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        {submitting ? "Creating account…" : "Create my admin account"}
      </button>
    </form>
  );
}
