"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

export default function GlobalLoginPage() {
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
    if (!isGlobalAdminRole(data.user.app_metadata?.role)) {
      await supabase.auth.signOut();
      setError("This login is for global admins only.");
      setLoading(false);
      return;
    }
    router.push("/console/global");
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
      {/* globals.css forces `input:focus/hover { background:#fff !important }` for the
          app's LIGHT surfaces. This login sits on a DARK card, so scope an override
          (higher specificity + !important) to keep the field transparent — the wrapper
          div owns the visible surface + gold focus ring. Also normalise placeholder +
          the stubborn Chrome autofill background. */}
      <style>{`
        /* globals.css uses input:hover:not(:focus) (specificity 0,2,1) with
           !important. To win, our selectors must out-specify it, hence the
           extra :not() qualifiers below (specificity 0,3,0). */
        .sa-input,
        .sa-input:hover:not(:focus),
        .sa-input:focus:not(:hover),
        .sa-input:focus-visible,
        .sa-input:hover:focus {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          color: var(--surface) !important;
        }
        .sa-input::placeholder { color: rgba(255,255,255,.32); }
        .sa-input:-webkit-autofill,
        .sa-input:-webkit-autofill:hover,
        .sa-input:-webkit-autofill:focus,
        .sa-input:-webkit-autofill:active {
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff !important;
          -webkit-box-shadow: inset 0 0 0 1000px #2a2c34 !important;
          box-shadow: inset 0 0 0 1000px #2a2c34 !important;
          transition: background-color 9999s ease-in-out 0s !important;
        }
      `}</style>

      <div
        style={{
          background: "#1e2028",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 16,
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 24px 60px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--surface)" }}>
            iqcommune
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldIcon />
            Global Admin — restricted access
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }} noValidate>
          <Field
            id="sa-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="globaladmin@iqcommune.in"
            icon={<MailIcon />}
          />

          <Field
            id="sa-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="••••••••••"
            icon={<LockIcon />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "rgba(255,255,255,.4)",
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.85)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
          />

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

// ── Reusable dark-surface field: leading icon, gold focus ring, optional
//    trailing adornment. One component for both inputs (structure is identical). ──
function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  icon,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 7, color: "rgba(255,255,255,.7)" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: focused ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.055)",
          border: `1px solid ${focused ? "var(--gold)" : "rgba(255,255,255,.14)"}`,
          borderRadius: 10,
          padding: "0 10px 0 12px",
          height: 46,
          boxShadow: focused ? "0 0 0 3px rgba(201,152,42,.22)" : "none",
          transition: "border-color .15s, box-shadow .15s, background .15s",
        }}
      >
        <span style={{ display: "flex", flexShrink: 0, color: focused ? "var(--gold)" : "rgba(255,255,255,.38)", transition: "color .15s" }}>
          {icon}
        </span>
        <input
          id={id}
          className="sa-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--surface)",
            fontSize: 14,
            fontFamily: "inherit",
            padding: 0,
          }}
        />
        {trailing}
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

function MailIcon() {
  return (
    <svg width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
