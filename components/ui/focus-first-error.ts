/**
 * Send focus, and the viewport, to the first field a failed submit rejected.
 *
 * The error message renders beside its own field, which on a long form is
 * routinely scrolled out of sight — the waitlist modal puts thirteen fields in
 * an internally scrolling panel, so a missing first name is announced entirely
 * off-screen and the submit button just looks broken.
 *
 * Fields are found by `aria-invalid`, which `components/ui/Field.tsx` already
 * sets on every control it draws. That keeps the DOM the single ordered list of
 * what is wrong: no form restates its field order, and a field added later is
 * covered without being registered anywhere.
 *
 * `data-invalid` covers the rest. Two controls — the waitlist audience picker
 * and the two photo pickers — are buttons standing in for a value, and
 * `aria-invalid` is not a supported attribute on `role="button"`, so marking
 * them that way would be invalid ARIA rather than helpful. They carry
 * `data-invalid` for this query and an `aria-describedby` pointing at their
 * error text, which is what actually announces the problem; a red border alone
 * is a colour-only signal (WCAG 1.4.1) and says nothing to a screen reader.
 *
 * Call it from the submit handler, never from an effect watching the error
 * state: focus should move because someone pressed submit, not because a
 * re-render changed an error. `PhotoSubmissionForm` clears its photo error the
 * moment a file is chosen, which an effect would read as a cue to pull focus
 * away mid-interaction.
 */
const INVALID = '[aria-invalid="true"], [data-invalid="true"]';

export function focusFirstError(form: HTMLFormElement | null): void {
  // The attribute lands only once React has committed the state that set it, so
  // the query has to wait for the frame after this handler returns.
  requestAnimationFrame(() => {
    const field = form?.querySelector<HTMLElement>(INVALID);
    if (!field) return;

    // `focus()` scrolls the shortest distance that reveals the element, which
    // parks it hard against the top of the scroll panel — under the modal's
    // sticky header, where the label and error sit just above the fold. Centring
    // it separately shows the field with its label and message together.
    field.focus({ preventScroll: true });
    // Optional call, as `CountUp` and `GalleryCarousel` do: jsdom ships no
    // `matchMedia`, and an environment without it must still get the scroll —
    // throwing here would leave the field focused somewhere off-screen, which is
    // the exact failure this function exists to prevent. Unknown reads as "no
    // preference expressed", so the motion stays.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    field.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  });
}
