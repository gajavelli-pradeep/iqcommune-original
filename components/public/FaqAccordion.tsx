"use client";
import { useState, useRef, useLayoutEffect, useCallback } from "react";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

/**
 * Single-open accordion: opening one item collapses the rest.
 * Content-agnostic — pass the questions/answers via `items` so every page
 * shares this one behaviour instead of re-implementing it.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  // The open panel's height is measured, not capped. A fixed maxHeight (e.g. the
  // old 1000px) silently clips long answers on narrow screens — worse as text
  // reflows taller on mobile. Measure the content and re-measure on resize so the
  // panel always reveals its full answer at every width.
  const contentRef = useRef<HTMLDivElement>(null);
  const [panelH, setPanelH] = useState(0);

  const measure = useCallback(() => {
    if (contentRef.current) setPanelH(contentRef.current.scrollHeight);
  }, []);

  useLayoutEffect(() => {
    measure();
    if (open === null) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  return (
    <div>
      {items.map((faq, i) => {
        const isOpen = open === i;
        const btnId = `faq-btn-${i}`;
        const panelId = `faq-panel-${i}`;
        return (
          <div
            key={i}
            style={{
              border: "1px solid rgba(20,18,12,0.10)",
              borderRadius: 12,
              background: "#ffffff",
              marginBottom: "0.75rem",
              overflow: "hidden",
              boxShadow: isOpen
                ? "0 8px 28px -10px rgba(20,18,12,0.18)"
                : "0 1px 2px rgba(20,18,12,0.04)",
              transition: "box-shadow 0.25s ease",
            }}
          >
            <button
              id={btnId}
              className="faq-row"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              style={{
                width: "100%",
                padding: "1.1rem 1.4rem",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                color: "#14161d",
                userSelect: "none",
                background: isOpen ? "#f8f7f4" : "transparent",
                border: "none",
                textAlign: "left",
                minHeight: 44,
                transition: "background 0.15s ease",
              }}
            >
              <span>{faq.q}</span>
              <svg
                width="16"
                height="16"
                fill="none"
                stroke={isOpen ? "#c9982a" : "#71717f"}
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.22s ease, stroke 0.15s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Height is measured (see `measure` above) so long answers never clip. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              style={{
                overflow: "hidden",
                maxHeight: isOpen ? panelH : 0,
                opacity: isOpen ? 1 : 0,
                transition: "max-height 0.35s ease, opacity 0.25s ease",
              }}
            >
              <div
                ref={isOpen ? contentRef : undefined}
                style={{
                  padding: "1rem 1.4rem 1.1rem",
                  fontSize: 14,
                  color: "#383b47",
                  lineHeight: 1.7,
                  borderTop: "1px solid rgba(20,18,12,0.10)",
                }}
              >
                {faq.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
