"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(15,17,23,.18)",
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
    if (password !== confirm) return setError("Passwords don't match — check and try again.");

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
      <div style={{ textAlign: "center" }}>
        {/* V6 success: white card, 56px green-light circle + green check, dark title */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--green-light)",
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
          Account activated
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 14px" }}>
          Your account is ready. Log in any time at iqcommune.com/login with this email and the password you just set.
        </p>
        {activatedAt && (
          <p style={{ fontSize: 12.5, color: "var(--ink-faint)", fontFamily: "monospace", margin: "0 0 16px" }}>
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
          background: "rgba(15,17,23,.10)",
          border: "1px solid rgba(15,17,23,.12)",
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
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", fontFamily: "inherit",
              minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
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
          borderRadius: 10,
          padding: "0.9rem",
          minHeight: 44,
          fontSize: 14,
          fontWeight: 500,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        {submitting ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
