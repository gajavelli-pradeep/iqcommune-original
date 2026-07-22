"use client";

/**
 * Five stars, keyboard-operable.
 *
 * The spec renders five buttons and colours them from a click handler, which
 * gives a keyboard or screen-reader user no way to know what is selected — or
 * to select anything. This is a radio group: arrow keys move between values,
 * each option is labelled with the word the spec shows only on hover, and the
 * current value is announced.
 */

export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below average",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const VALUES = [1, 2, 3, 4, 5];

export function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="text-center">
      <p id="rating-prompt" className="mb-6 text-xl font-medium text-ink">
        Rate the practitioner out of 5
      </p>

      <div
        role="radiogroup"
        aria-labelledby="rating-prompt"
        className="mb-3 flex items-center justify-center gap-2.5"
      >
        {VALUES.map((option) => {
          const selected = value !== null && option <= value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={value === option}
              aria-label={`${option} — ${RATING_LABELS[option]}`}
              // Only the selected star stays tabbable, so the group is one stop.
              tabIndex={value === option || (value === null && option === 1) ? 0 : -1}
              onClick={() => onChange(option)}
              data-value={option}
              onKeyDown={(event) => {
                const forward = event.key === "ArrowRight" || event.key === "ArrowUp";
                const back = event.key === "ArrowLeft" || event.key === "ArrowDown";
                if (!forward && !back) return;
                event.preventDefault();

                // Anchored on the focused option, not on the current value:
                // with nothing selected yet, focus sits on the first star, and
                // arrowing right from it must reach the second — not select
                // the one the user is already standing on.
                const anchor = Number(event.currentTarget.dataset.value);
                const next = forward ? Math.min(5, anchor + 1) : Math.max(1, anchor - 1);
                onChange(next);

                // Focus follows selection. A roving tabindex that moves the
                // selection but leaves focus behind means the next arrow press
                // is computed from a button the user is no longer on — the
                // value and the focus ring drift apart.
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)
                  ?.focus();
              }}
              /* `shrink-0` is the touch-target fix: the row is flex, so the
                 declared 48px was being squeezed to 42px at narrow widths —
                 under the floor exactly where the control is used most. Five
                 stars and four gaps still fit inside 320px. */
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:hover:scale-100"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                aria-hidden
                focusable="false"
                // V7 filled star: gold fill with a gold-dark stroke (two colours).
                className={selected ? "fill-gold stroke-gold-dark" : "fill-none stroke-border-strong"}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Two states, as the spec has: faint until a rating is chosen, gold
          once it is. One colour for both loses the feedback the colour exists
          to give. */}
      <p
        aria-live="polite"
        className={`mt-2 min-h-5 text-base font-medium ${value === null ? "text-ink-faint" : "text-gold-dark"}`}
      >
        {value === null ? "Tap a star to rate" : `${value} — ${RATING_LABELS[value]}`}
      </p>
    </div>
  );
}
