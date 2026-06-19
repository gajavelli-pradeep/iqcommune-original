"use client";
import { useState } from "react";
import { RequestModal } from "@/components/public/RequestModal";

const DRAWER_TRUST = [
  "In-person sessions · max 20 participants",
  "All practitioners currently active in their domain",
  "We'll reach out within 2–3 working days",
] as const;

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,17,23,0.10)",
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          {/* Logo */}
          <a
            href="#"
            style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 3 }}
          >
            <span style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
              <span style={{ color: "#c9982a", fontWeight: 700, fontSize: 26, letterSpacing: "-0.04em" }}>iq</span>
              <span style={{ color: "#0f1117", fontWeight: 300, fontSize: 26, letterSpacing: "-0.04em" }}>commune</span>
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: "0.1em",
                color: "#9496a1",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Where financial intelligence connects
            </span>
          </a>

          {/* Desktop CTA — hidden on mobile via CSS */}
          <div className="nav-cta-desktop">
            <RequestModal variant="nav" />
          </div>

          {/* Hamburger — shown only on mobile via CSS */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              background: "none",
              border: "1.5px solid rgba(15,17,23,0.15)",
              borderRadius: 9,
              padding: "9px 11px",
              cursor: "pointer",
              color: "#0f1117",
              display: "none", // overridden to flex in globals.css on mobile
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.15s",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="3" y1="3" x2="15" y2="15" />
                  <line x1="15" y1="3" x2="3" y2="15" />
                </>
              ) : (
                <>
                  <line x1="2" y1="5" x2="16" y2="5" />
                  <line x1="2" y1="9" x2="16" y2="9" />
                  <line x1="2" y1="13" x2="16" y2="13" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* ── Mobile drawer ── */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: menuOpen ? 360 : 0,
            transition: "max-height 0.3s ease",
          }}
        >
          <div
            style={{
              borderTop: "1px solid rgba(15,17,23,0.08)",
              padding: "1.25rem 1.5rem 1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              background: "#fff",
            }}
          >
            {/* Trust signals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {DRAWER_TRUST.map((t) => (
                <div
                  key={t}
                  style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#4a4d5c" }}
                >
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    stroke="#c9982a"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t}
                </div>
              ))}
            </div>

            {/* CTA — closes drawer, then modal opens */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div onClick={() => setMenuOpen(false)}>
              <RequestModal variant="mobile" />
            </div>
          </div>
        </div>
      </nav>

      {/* Backdrop — closes drawer on tap-outside */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
          }}
        />
      )}
    </>
  );
}
