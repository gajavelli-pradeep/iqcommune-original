"use client";

import Link from "next/link";

export function AdminTopNav({ email }: { email: string }) {
  return (
    <nav
      style={{
        height: 64,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(15,17,23,.10)",
        padding: "0 1.75rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ color: "#c9982a", fontWeight: 700, fontSize: 22, letterSpacing: "-0.04em" }}>iq</span>
          <span style={{ color: "#0f1117", fontWeight: 300, fontSize: 22, letterSpacing: "-0.04em" }}>commune</span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9496a1", lineHeight: 1 }}>
          Where financial intelligence connects
        </span>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: "rgba(15,17,23,.18)", flexShrink: 0 }} />

      {/* Admin console label */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6510", lineHeight: 1.4 }}>
          Admin
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6510", lineHeight: 1.4 }}>
          Console
        </span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: "#f8f7f4",
            border: "1px solid rgba(15,17,23,.18)",
            borderRadius: 100,
            padding: "7px 16px",
            width: 300,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "#9496a1" }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search practitioners, requests…"
            style={{ border: "none", background: "none", fontFamily: "inherit", fontSize: 13, color: "#0f1117", width: "100%", outline: "none" }}
          />
        </div>
      </div>

      {/* Right: bell + avatar + email */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          aria-label="Notifications"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(15,17,23,.18)",
            background: "none",
            cursor: "pointer",
            color: "#4a4d5c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
          </svg>
          <span
            style={{
              width: 7,
              height: 7,
              background: "#c9982a",
              border: "2px solid white",
              borderRadius: "50%",
              position: "absolute",
              top: 5,
              right: 5,
            }}
          />
        </button>

        <div
          style={{
            width: 34,
            height: 34,
            background: "#0f1117",
            color: "white",
            borderRadius: "50%",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
          }}
        >
          {email ? email[0].toUpperCase() : "A"}
        </div>

        <span style={{ fontSize: 12, color: "#4a4d5c" }}>{email}</span>
      </div>
    </nav>
  );
}
