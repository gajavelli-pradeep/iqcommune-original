"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminUI } from "@/components/admin/AdminUIContext";

const NOTIF_LINKS: { label: string; tab: string }[] = [
  { label: "Review new session requests", tab: "requests" },
  { label: "Pending payouts to settle", tab: "payouts" },
  { label: "New practitioner applications", tab: "practitioners" },
];

export function AdminTopNav({ email }: { email: string }) {
  const { globalSearch, setGlobalSearch, setActiveTab } = useAdminUI();
  const [bellOpen, setBellOpen] = useState(false);

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
        borderBottom: "1px solid rgba(20,18,12,.10)",
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
            <span style={{ color: "var(--ink)", fontWeight: 300, fontSize: 22, letterSpacing: "-0.04em" }}>commune</span>
          </div>
          {/* Gap 1: logo-tag */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            Where financial intelligence connects
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: "rgba(20,18,12,.18)", flexShrink: 0 }} />

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
            border: "1px solid rgba(20,18,12,.18)",
            borderRadius: 100,
            padding: "7px 16px",
            width: 300,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "var(--ink-faint)" }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search across practitioners, sessions, requests…"
            style={{ border: "none", background: "none", fontFamily: "inherit", fontSize: 13, color: "var(--ink)", width: "100%", outline: "none" }}
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              aria-label="Clear search"
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right cluster — Gap 4: 'Admin' label, Gap 5: dot position/border */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {/* Gap 4: 'Admin' text label (no email shown) */}
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Admin</span>

        {/* Bell + popover */}
        <div style={{ position: "relative" }}>
          <button
            aria-label="Notifications"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(20,18,12,.18)",
              background: bellOpen ? "#f8f7f4" : "none",
              cursor: "pointer",
              color: "var(--ink-soft)",
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
            <span style={{ width: 7, height: 7, background: "#c9982a", border: "1.5px solid white", borderRadius: "50%", position: "absolute", top: 6, right: 6 }} />
          </button>

          {bellOpen && (
            <>
              <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 290 }} />
              <div
                role="menu"
                style={{ position: "absolute", top: 42, right: 0, width: 260, background: "#fff", border: "1px solid rgba(20,18,12,.12)", borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.14)", zIndex: 300, overflow: "hidden" }}
              >
                <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", borderBottom: "1px solid rgba(20,18,12,.08)" }}>
                  Quick actions
                </div>
                {NOTIF_LINKS.map((n) => (
                  <button
                    key={n.tab}
                    role="menuitem"
                    onClick={() => { setActiveTab(n.tab); setBellOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "var(--ink)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f8f7f4")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            background: "var(--ink)",
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
