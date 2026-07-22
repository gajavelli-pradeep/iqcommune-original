import type { ReactNode } from "react";

/**
 * Gold-rule callout — the left-bordered gold-tinted note that recurs across the
 * marketing and flow pages (audit M3, ~7 sites). Text is `--color-gold-dark`,
 * never `--color-gold`: gold on the gold-light fill fails AA. An optional
 * `title` renders in ink for the emphasised lead; the body stays gold-dark.
 */
export function Callout({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-r-sm border border-l-[3px] border-gold-border border-l-gold bg-gold-light px-4 py-[0.85rem] text-base leading-[1.65] text-gold-dark">
      {title ? <strong className="mb-1 block font-semibold text-ink">{title}</strong> : null}
      {children}
    </div>
  );
}
