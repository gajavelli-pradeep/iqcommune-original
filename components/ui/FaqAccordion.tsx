"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Single-open accordion — opening one question closes the rest, and clicking an
 * open question closes it, matching the spec's `toggleFaq`.
 *
 * Extracted at its second use: the landing page asks nine questions, the
 * practitioner page ten, and the behaviour is identical.
 *
 * Accessibility the spec's version lacks: each question is a real button with
 * `aria-expanded` and `aria-controls`, and each answer is a labelled region.
 * The spec toggles a class on a div, which tells a screen reader nothing.
 *
 * Answers stay in the DOM when collapsed. An accordion is progressive
 * disclosure, not deletion — the parity gate must still find every word, and so
 * must a search engine.
 */

export interface Faq {
  question: string;
  answer: ReactNode;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      focusable="false"
      className={`shrink-0 text-ink-faint transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function FaqAccordion({
  faqs,
  maxWidth = "780px",
}: {
  faqs: ReadonlyArray<Faq>;
  /** V7 sets the FAQ column per page: 780px on the landing page, 720px on empanelment. */
  maxWidth?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <ul className="mx-auto" style={{ maxWidth }}>
      {faqs.map((faq, index) => {
        const open = openIndex === index;
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        return (
          <li
            key={faq.question}
            className="mb-3 overflow-hidden rounded-[12px] border border-border bg-surface"
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className={`flex w-full items-center justify-between gap-4 px-[1.4rem] py-[1.1rem] text-left text-lg font-medium text-ink transition-colors hover:bg-surface-soft ${
                  open ? "bg-surface-soft" : ""
                }`}
              >
                {faq.question}
                <ChevronIcon open={open} />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="border-t border-border px-[1.4rem] pt-4 pb-[1.1rem] text-md leading-[1.7] text-ink-muted"
            >
              {faq.answer}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
