import type { ReactNode } from "react";

/**
 * A row of short icon+label items that wraps.
 *
 * Extracted at its second use, per the plan's rule: the trust bar and audience
 * ribbon needed it, the CTA reassurance row made it three. The icons are
 * decorative in every case — each sits beside a label that already carries the
 * meaning — so they are hidden from assistive tech here rather than at each
 * call site, where it would eventually be forgotten.
 */

export type IconStripEntry = { label: string; icon: ReactNode };

export function IconStrip({
  entries,
  className,
  listClassName,
  itemClassName,
  iconClassName,
  iconSize = 15,
}: {
  entries: readonly IconStripEntry[];
  /** Wrapper — owns the band's background and padding. */
  className?: string;
  /** The list itself — owns width and the gaps between items. */
  listClassName: string;
  itemClassName: string;
  iconClassName?: string;
  iconSize?: number;
}) {
  return (
    <div className={className}>
      <ul className={listClassName}>
        {entries.map((entry) => (
          <li key={entry.label} className={itemClassName}>
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
              focusable="false"
              className={`shrink-0 ${iconClassName ?? ""}`}
            >
              {entry.icon}
            </svg>
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
