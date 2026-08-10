"use client";

/**
 * "Did you mean gmail.com?" under an email field.
 *
 * A suggestion, never a block. The address is already valid by the time this
 * shows — the only thing wrong with `vikram@gmial.com` is that nobody owns the
 * domain, and refusing it would also refuse the real company address that
 * happens to sit one keystroke from a free one.
 *
 * `aria-live` because it appears while someone is typing: a correction nobody
 * is told about helps only the people watching that exact spot.
 */
export function EmailTypoHint({
  suggestion,
  onAccept,
}: {
  /** The whole corrected address, or nothing when there is no confident fix. */
  suggestion?: string;
  onAccept: (email: string) => void;
}) {
  if (!suggestion) return null;

  return (
    <span className="mt-1 block" role="status" aria-live="polite">
      Did you mean{" "}
      {/* `tap-44` rather than padding: this sits inline inside the hint, so
          `min-block-size` cannot reach it and the pseudo-element supplies the
          touch target without pushing the line apart. */}
      <button
        type="button"
        onClick={() => onAccept(suggestion)}
        className="tap-44 rounded font-medium text-ink underline underline-offset-2 transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {suggestion}
      </button>
      ?
    </span>
  );
}
