import { IqMark } from "./IqMark";

const LINKEDIN_URL = "https://www.linkedin.com/company/iqcommune/";

/**
 * Shared public-site footer. One component, both pages.
 * - `top`     : optional block above the brand line (home = recruitment CTA,
 *               practitioners = back link).
 * - `tagline` : second row of the brand lockup ("Where the insight quotient is unleashed").
 * - `email`   : contact address; rendered as a mailto link.
 * Copyright year is always dynamic. Brand line is an IQ-mark + 2-row lockup.
 */
export type SiteFooterProps = {
  tagline: string;
  email: string;
  top?: React.ReactNode;
};

export function SiteFooter({ tagline, email, top }: SiteFooterProps) {
  return (
    <footer
      style={{
        background: "var(--ink)",
        padding: "2rem",
        textAlign: "center",
        fontSize: 13,
        color: "rgba(255,255,255,0.30)",
      }}
    >
      {top}

      {/* Brand lockup: IQ mark aligned to the two stacked text rows. */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
        <IqMark size={38} ring />
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left" }}>
          <strong style={{ color: "rgba(255,255,255,0.82)", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            iqcommune
          </strong>
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 12, lineHeight: 1.2 }}>{tagline}</span>
        </span>
      </div>

      <p style={{ marginTop: "0.9rem" }}>
        <a href={`mailto:${email}`} className="foot-link" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
          {email}
        </a>
        {" · "}
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="foot-link"
          style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}
        >
          LinkedIn
        </a>
      </p>
      <p style={{ marginTop: "0.5rem" }}>© {new Date().getFullYear()} iqcommune. All rights reserved.</p>
    </footer>
  );
}
