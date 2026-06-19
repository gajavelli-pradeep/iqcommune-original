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
      {/* Logo — Gap 1, 2, 32: logo-col wraps wordmark + tagline; link stays '/' */}
      <Link href="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
        {/* logo-col: wordmark + tagline stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* logo-mark row */}
          <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
            <span style={{ color: "#c9982a", fontWeight: 700, fontSize: 22, letterSpacing: "-0.04em" }}>iq</span>
            <span style={{ color: "#0f1117", fontWeight: 300, fontSize: 22, letterSpacing: "-0.04em" }}>commune</span>
          </div>
          {/* Gap 1: logo-tag */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#9496a1",
            }}
          >
            Where financial intelligence connects
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: "rgba(15,17,23,.18)", flexShrink: 0 }} />

        {/* Admin console label */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6510", lineHeight: 1.4 }}>
            Admin
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6510", lineHeight: 1.4 }}>
            Console
          </span>
        </div>
      </Link>

      {/* Search — Gap 3: corrected placeholder */}
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
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "#9496a1" }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search across practitioners, sessions, requests…"
            style={{ border: "none", background: "none", fontFamily: "inherit", fontSize: 13, color: "#0f1117", width: "100%", outline: "none" }}
          />
        </div>
      </div>

      {/* Right cluster — Gap 4: 'Admin' label, Gap 5: dot position/border */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {/* Gap 4: 'Admin' text label (no email shown) */}
        <span style={{ fontSize: 12, color: "#4a4d5c" }}>Admin</span>

        {/* Bell */}
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
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* Gap 5: top:6, right:6, border:1.5px */}
          <span
            style={{
              width: 7,
              height: 7,
              background: "#c9982a",
              border: "1.5px solid white",
              borderRadius: "50%",
              position: "absolute",
              top: 6,
              right: 6,
            }}
          />
        </button>

        {/* Avatar */}
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
      </div>
    </nav>
  );
}
