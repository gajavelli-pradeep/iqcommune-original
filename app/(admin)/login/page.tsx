"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
        background: "#f8f7f4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(15,17,23,.1)",
          borderRadius: 14,
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            iqcommune
          </div>
          <div style={{ fontSize: 14, color: "#9496a1", marginTop: 4 }}>
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              placeholder="••••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "#fdf0f0",
                border: "1px solid #f0b0b0",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "#a32d2d",
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
              background: "#0f1117",
              color: "#fff",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(15,17,23,.18)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};
