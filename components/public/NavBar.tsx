"use client";
import { RequestModal } from "@/components/public/RequestModal";
import { SiteHeader } from "@/components/public/SiteHeader";

const DRAWER_TRUST = [
  "In-person sessions · max 20 participants",
  "All practitioners currently active in their domain",
  "We'll reach out within 2–3 working days",
] as const;

/** Home-page header preset: request-a-session CTA + mobile trust drawer. */
export function NavBar() {
  return (
    <SiteHeader
      right={
        <div className="nav-cta-desktop">
          <RequestModal variant="nav" />
        </div>
      }
      drawer={(close) => (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {DRAWER_TRUST.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-soft)" }}>
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ stroke: "var(--gold)", flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </div>
            ))}
          </div>

          {/* CTA — closes drawer, then modal opens */}
          <div onClick={close}>
            <RequestModal variant="mobile" />
          </div>
        </>
      )}
    />
  );
}
