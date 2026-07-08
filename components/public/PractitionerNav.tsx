"use client";
import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";

/**
 * Practitioners-page header preset: "See iqcommune for Learners" cross-link.
 * Client component so the mobile-drawer render-prop can cross into SiteHeader
 * (functions can't be passed from a Server Component). On <768px the desktop
 * pill hides and the link collapses into the hamburger drawer.
 */
const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gold-dark)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  background: "transparent",
  border: "1px solid rgba(20,18,12,0.20)",
  borderRadius: 100,
  padding: "9px 18px",
};

export function PractitionerNav() {
  return (
    <SiteHeader
      logoHref="/"
      badge={["Practitioner", "Network"]}
      right={
        <div className="nav-cta-desktop">
          <Link href="/" className="nav-pill" style={PILL_STYLE}>
            See iqcommune for Learners
          </Link>
        </div>
      }
      drawer={(close) => (
        <Link
          href="/"
          onClick={close}
          className="nav-pill"
          style={{ ...PILL_STYLE, justifyContent: "center", fontSize: 11, padding: "12px 18px" }}
        >
          See iqcommune for Learners
        </Link>
      )}
    />
  );
}
