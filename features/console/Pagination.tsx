"use client";

/**
 * A pager for a console table.
 *
 * It always states the range and the total ("Showing 26–50 of 312") rather than
 * only offering arrows: on an audit trail the useful question is usually "how
 * much is there", and a bare Next button never answers it.
 *
 * Both controls stay mounted and disable at the ends, so the row of buttons
 * does not reflow as you page — a Next button that moves under the cursor on
 * the last page is how you end up clicking something else.
 */
export function Pagination({
  page,
  pageSize,
  total,
  busy,
  onPage,
  label,
}: {
  page: number;
  pageSize: number;
  total: number;
  busy?: boolean;
  onPage: (page: number) => void;
  /** What is being paged, for the screen-reader announcement. */
  label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const button =
    "inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45 [@media(any-pointer:coarse)]:min-h-11";

  return (
    <nav aria-label={`${label} pagination`} className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-xs text-ink-muted">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1 || busy}
          className={button}
        >
          <span aria-hidden>←</span> Previous
        </button>
        <span className="text-xs text-ink-faint">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages || busy}
          className={button}
        >
          Next <span aria-hidden>→</span>
        </button>
      </div>
    </nav>
  );
}
