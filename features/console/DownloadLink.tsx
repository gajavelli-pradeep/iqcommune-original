import type { ReactNode } from "react";

/**
 * A download action in a console table (V7 `.btn-ghost.btn-xs` with a leading
 * download glyph).
 *
 * An anchor, not a button: this navigates to a route that returns a file, and
 * the browser's own download handling is better than anything re-implemented on
 * top of a click handler. It also means a middle-click or "save link as" works,
 * which a button silently breaks.
 *
 * No Undo window either — `RowAction`'s 15-second hold exists so a mutation can
 * be taken back, and a download changes nothing.
 */
export function DownloadLink({
  href,
  label,
  title,
  icon,
}: {
  href: string;
  label: string;
  /** The fuller description, when the visible label is a single word. */
  title?: string;
  icon?: ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {icon ?? <DownloadIcon />}
      {label}
    </a>
  );
}

export function DownloadIcon() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
