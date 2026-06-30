"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SuperLoginPage() {
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
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setError("Invalid credentials.");
      setLoading(false);
      return;
    }
    if (data.user.app_metadata?.role !== "super_admin") {
      await supabase.auth.signOut();
      setError("This login is for super admins only.");
      setLoading(false);
      return;
    }
    router.push("/console/super");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#1e2028",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 14,
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--surface)" }}>
            iqcommune
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldIcon />
            Super Admin — restricted access
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }} noValidate>
          <div>
            <label htmlFor="sa-email" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "rgba(255,255,255,.7)" }}>
              Email
            </label>
            <input
              id="sa-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="superadmin@iqcommune.in"
            />
          </div>

          <div>
            <label htmlFor="sa-password" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "rgba(255,255,255,.7)" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="sa-password"
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
                  color: "rgba(255,255,255,.4)",
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "rgba(220,53,69,.15)",
                border: "1px solid rgba(220,53,69,.4)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "#ff6b6b",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              background: "var(--gold)",
              color: "var(--ink)",
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
            {loading ? "Verifying…" : "Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width={13} height={13} fill="none" stroke="var(--gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: "rgba(255,255,255,.07)",
  color: "var(--surface)",
  boxSizing: "border-box",
};
