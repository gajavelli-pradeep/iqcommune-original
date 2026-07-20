"use client";

import { useState } from "react";

export interface Perk {
  title: string;
  sub: React.ReactNode;
  featured?: boolean;
  icon: React.ReactNode;
}

/**
 * Hero perks list. V6 shows the first `initialCount` perks and tucks the rest
 * behind a "Show more" toggle (empanelment mockup `perks-more` + `perks-toggle`).
 * The collapsed perks stay in the DOM so they remain findable/announced once
 * expanded; nothing here is required to read the page.
 */
export function PerksList({ perks, initialCount = 4 }: { perks: Perk[]; initialCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = perks.length - initialCount;
  const visible = expanded ? perks : perks.slice(0, initialCount);

  return (
    <>
      <div className="iq-perks" style={{ display: "flex", flexDirection: "column" }}>
        {visible.map((perk, i) => (
          <div
            key={perk.title}
            className={perk.featured ? "iq-perk iq-perk--featured" : "iq-perk"}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              paddingTop: "0.85rem",
              paddingBottom: "0.85rem",
              borderBottom: i < visible.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}
          >
            <div
              className="iq-perk-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--gold)",
                marginTop: 1,
              }}
            >
              {perk.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--surface)", marginBottom: 2 }}>
                {perk.title}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                {perk.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: "0.9rem",
            padding: "10px 4px",
            minHeight: 44,
            background: "none",
            border: "none",
            color: "var(--gold)",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {expanded ? "Show less" : "Show more"}
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </>
  );
}
