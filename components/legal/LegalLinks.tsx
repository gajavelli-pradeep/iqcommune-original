"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { Modal } from "@/components/ui/Modal";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/content/legal";

/**
 * The footer's Privacy Policy and Terms of Use links, and the dialog they open.
 *
 * A dialog rather than two routes, per the client's own steer ("the same UX as
 * the request form — a window with a scrollbar and a close option"). It is also
 * the better answer here: these are documents a visitor checks mid-thought,
 * usually while deciding whether to submit the form on the page behind them. A
 * route navigation loses that page's state and makes the back button the way
 * home; a dialog closes and leaves them exactly where they were.
 *
 * Everything the dialog owes a reader — Escape, focus trap, scroll lock,
 * focus returned to the link — comes from the shared Modal, which is the same
 * component the request form uses. Nothing is re-implemented here.
 */
export function LegalLinks({ className = "" }: { className?: string }) {
  const [openKey, setOpenKey] = useState<LegalDocument["key"] | null>(null);
  const active = LEGAL_DOCUMENTS.find((doc) => doc.key === openKey) ?? null;

  return (
    <>
      {LEGAL_DOCUMENTS.map((doc, index) => (
        <span key={doc.key}>
          {index > 0 ? <Separator /> : null}
          <button
            type="button"
            onClick={() => setOpenKey(doc.key)}
            className={`tap-44 underline-offset-2 transition-colors hover:text-on-dark-bright hover:underline focus-visible:text-on-dark-bright focus-visible:underline ${className}`}
          >
            {doc.title}
          </button>
        </span>
      ))}

      {/* Portalled to the body because these links live inside the footer's
          <p>, and a dialog rendered in place makes the policy's <ul> a
          descendant of that paragraph. The browser then reparents it while
          React expects it where it put it — six console errors and a
          hydration mismatch. Being fixed-position is not the same as being
          outside the paragraph in the DOM. */}
      {active
        ? createPortal(
            <Modal
              open
              onClose={() => setOpenKey(null)}
              title={active.title}
              maxWidth="760px"
            >
              <LegalBody document={active} />
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * The footer's separator.
 *
 * The spaces are real text nodes, not padding. The dot is `aria-hidden`, so
 * with CSS-only spacing a screen reader reads straight through the gap —
 * "Privacy PolicyTerms of Usehello@iqcommune.com". A space either side is what
 * gives it the pause a sighted reader gets from the dot.
 */
export function Separator() {
  return (
    <>
      {" "}
      <span aria-hidden className="text-on-dark-divider">
        ·
      </span>{" "}
    </>
  );
}

/**
 * Long-form legal prose, which is a different typographic problem from the rest
 * of the site: a wall of 15px text at the body line-height is what makes people
 * close these unread. Measure is capped, leading is opened up, and headings do
 * the scanning work.
 */
function LegalBody({ document }: { document: LegalDocument }) {
  return (
    <div className="text-md leading-[1.7] text-ink-muted">
      {document.blocks.map((block, index) => {
        if (block.type === "heading") {
          // The document's own h1 becomes the dialog title, so its sections
          // start at h2 — the heading order a screen reader walks stays intact.
          const Tag = block.level === 1 ? "h2" : "h3";
          return (
            <Tag
              key={index}
              className={
                block.level === 1
                  ? "mt-7 mb-2 text-lg font-semibold text-ink first:mt-0"
                  : "mt-5 mb-1.5 text-base font-semibold text-ink"
              }
            >
              {block.text}
            </Tag>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="mb-3 list-disc space-y-1.5 pl-5 marker:text-gold">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="mb-3">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
