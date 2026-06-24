/**
 * Shared public-site footer. One component, both pages.
 * - `top`     : optional block above the brand line (home = recruitment CTA,
 *               practitioners = back link).
 * - `tagline` : middle text in the brand line ("Where financial intelligence connects.").
 * - `email`   : contact address; rendered as a mailto link.
 * Copyright year is always dynamic.
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
        borderTop: "1px solid rgba(201,152,42,0.20)",
        padding: "2rem",
        textAlign: "center",
        fontSize: 13,
        color: "rgba(255,255,255,0.62)",
      }}
    >
      {top}

      <p>
        <strong style={{ color: "rgba(255,255,255,0.70)", fontWeight: 500 }}>iqcommune</strong>
        {" — "}
        {tagline}
        {" · "}
        <a href={`mailto:${email}`} className="foot-link" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
          {email}
        </a>
      </p>
      <p style={{ marginTop: "0.5rem" }}>© {new Date().getFullYear()} iqcommune. All rights reserved.</p>
    </footer>
  );
}
