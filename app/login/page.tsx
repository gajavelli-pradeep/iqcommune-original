"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Invalid credentials.");
      setLoading(false);
      return;
    }
    router.push("/console");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid rgba(20,18,12,.1)",
          borderRadius: 14,
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>iqcommune</div>
          <div style={{ fontSize: 14, color: "var(--ink-faint)", marginTop: 4 }}>
            Admin console — sign in to continue
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }} noValidate>
          <div>
            <label
              htmlFor="email"
              style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="admin@iqcommune.in"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5 }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 42 }}
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 1,
                  top: 1,
                  bottom: 1,
                  width: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "0 7px 7px 0",
                  cursor: "pointer",
                  color: "var(--ink-faint)",
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "var(--red-light)",
                border: "1px solid var(--red-border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--red)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-cta"
            disabled={loading}
            style={{
              padding: "12px",
              background: "var(--ink)",
              color: "var(--surface)",
              border: "none",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontFamily: "inherit",
              marginTop: 4,
            }}
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Eye() {
  return (
    <svg width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// outline removed — globals.css :focus-visible provides the gold ring
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--surface)",
  boxSizing: "border-box",
};
