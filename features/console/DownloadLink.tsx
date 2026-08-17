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
 * No Undo window either — `RowAction`'s hold exists so a mutation can be taken
 * back, and a download changes nothing.
 */
export function DownloadLink({
  href,
  label,
  sublabel,
  title,
  icon,
  tone = "ghost",
}: {
  href: string;
  label: string;
  /** V7 puts a dimmer qualifier inside the button, e.g. "(fallback, …)". */
  sublabel?: string;
  /** The fuller description, when the visible label is a single word. */
  title?: string;
  icon?: ReactNode;
  /**
   * `ghost` is the resting look everywhere. `gold` is V7's post-generate state
   * on the consent panel, where the colour change is what reports that the
   * confirmation was created. `dark` is V7 `.btn-dark`, which it uses for the
   * photo guide download in Part 3 — the one download it draws as the filled
   * action rather than the quiet one.
   *
   * Gold takes an ink label, not V7's white: white on `--color-gold` is 2.1:1
   * and fails AA (same call as `RowAction`'s `primary`). Dark keeps white —
   * white on `--color-ink` is 17:1.
   */
  tone?: "ghost" | "gold" | "dark";
}) {
  const LOOKS = {
    gold: "bg-gold text-ink shadow-gold hover:brightness-[1.08]",
    dark: "bg-ink text-surface hover:opacity-90",
    ghost: "border border-border-strong bg-surface text-ink-muted hover:bg-surface-soft hover:text-ink",
  };
  const look = LOOKS[tone];

  return (
    <a
      href={href}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${look}`}
    >
      {icon ?? <DownloadIcon />}
      {label}
      {sublabel ? <span className="font-normal opacity-75">{sublabel}</span> : null}
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
