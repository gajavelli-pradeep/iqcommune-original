"use client";
import { useState } from "react";
import Link from "next/link";

/**
 * Shared public-site sticky header. One component, both pages.
 * - `right`    : the right-side action (home = CTA, practitioners = back link).
 * - `badge`    : optional stacked label after the wordmark (e.g. ["Practitioner","Network"]).
 * - `drawer`   : optional mobile-drawer content as a render-prop receiving `close`.
 *                When provided, a hamburger toggle + backdrop are rendered.
 */
export type SiteHeaderProps = {
  logoHref?: string;
  badge?: readonly string[];
  right: React.ReactNode;
  drawer?: (close: () => void) => React.ReactNode;
};

export function SiteHeader({ logoHref = "/", badge, right, drawer }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(20,18,12,0.10)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          {/* Logo: wordmark + tagline, optional badge */}
          <Link
            href={logoHref}
            className="nav-logo"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: badge ? 14 : 0 }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
                <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.04em" }}>iq</span>
                <span style={{ color: "var(--ink)", fontWeight: 300, fontSize: 26, letterSpacing: "-0.04em" }}>commune</span>
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                Where financial intelligence connects
              </span>
            </span>

            {badge && (
              <span
                style={{
                  borderLeft: "1px solid rgba(20,18,12,0.18)",
                  paddingLeft: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {badge.map((line) => (
                  <span
                    key={line}
                    style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-dark)", lineHeight: 1.4 }}
                  >
                    {line}
                  </span>
                ))}
              </span>
            )}
          </Link>

          {/* Desktop right action */}
          {right}

          {/* Hamburger — only when a drawer is supplied (shown on mobile via globals.css) */}
          {drawer && (
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              style={{
                background: "none",
                border: "1.5px solid rgba(20,18,12,0.15)",
                borderRadius: 9,
                padding: "9px 11px",
                cursor: "pointer",
                color: "var(--ink)",
                display: "none", // overridden to flex in globals.css on mobile
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
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
          )}
        </div>

        {/* Mobile drawer */}
        {drawer && (
          <div
            // inert + aria-hidden keep keyboard focus and screen-reader content out of the
            // closed drawer without unmounting it (avoids layout shift on re-open).
            inert={!menuOpen || undefined}
            aria-hidden={!menuOpen}
            style={{ overflow: "hidden", maxHeight: menuOpen ? 360 : 0, transition: "max-height 0.3s ease" }}
          >
            <div
              style={{
                borderTop: "1px solid rgba(20,18,12,0.08)",
                padding: "1.25rem 1.5rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem",
                background: "#fff",
              }}
            >
              {drawer(close)}
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop — closes drawer on tap-outside */}
      {drawer && menuOpen && (
        <div onClick={close} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 99 }} />
      )}
    </>
  );
}
