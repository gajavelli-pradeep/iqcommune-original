/**
 * One definition for every control a person types into or selects from.
 *
 * Before this, each call site carried its own class string. There were 42 of
 * them and no two agreed: 10px radius against V7's 8px, a 0.20 border where the
 * console uses 0.18, 7px padding against 9px, five different focus treatments.
 * None of it was visible in review, because each string looked reasonable on
 * its own — the inconsistency only exists between files.
 *
 * **Recipes, not wrapper components.** The public pages want a labelled block
 * (`Field` supplies it); the console wants a bare editor inside a table cell,
 * where a labelled block would break the row. A single component cannot be both
 * without growing a mode flag per caller, so the shared thing is the class
 * recipe and `Field` is one consumer of it.
 *
 * Every value is measured from the V7 HTML (`scripts/measure-v7-controls.mjs`),
 * never chosen. Three families came out of that measurement; all three are
 * here, and nothing else is.
 *
 * The class strings are written out in full and never assembled from fragments:
 * Tailwind scans source text, so a class built by concatenation compiles to
 * nothing and fails silently at runtime.
 */

/**
 * Which family a control belongs to.
 *
 * `field`   — the public and flow-page form field. White, 14px, 11/14 padding.
 * `inline`  — the console's in-table editor (V7 `.status-sel`). Soft fill, the
 *             lighter 0.18 edge, 9/12 padding, and a gold border on focus.
 * `compact` — the tight selects inside a console form card (V7's confirmation
 *             hour/minute/meridiem/duration). White, because they sit on a
 *             white card rather than the page, with a 6px corner and 8/6
 *             padding so four of them fit a row without wrapping.
 *
 * Three, because the measurement found three. Collapsing `compact` into
 * `field` would be the tidier code and the wrong picture: 6px against 8px and
 * 8/6 against 11/14 is the difference between four controls fitting one row
 * and three of them fitting.
 */
export type ControlTone = "field" | "inline" | "compact";

/** V7 uses three type sizes across its controls; nothing else appears. */
export type ControlSize = "xs" | "sm" | "md";

export interface ControlOptions {
  tone?: ControlTone;
  size?: ControlSize;
  /** Marks the control invalid — pairs with `aria-invalid` on the element. */
  invalid?: boolean;
  /** Appended verbatim, for genuine one-offs like a fixed width in a cell. */
  className?: string;
}

/**
 * Shared by every control regardless of family.
 *
 * `focus:border-gold` is V7's own focus treatment (measured: `.status-sel:focus`
 * → rgb(201,152,42)). The visible outline is kept alongside it rather than
 * replaced by it: a border colour change alone is a ~1px signal and fails
 * WCAG 2.4.11 for anyone who cannot pick it out.
 *
 * The `disabled` and `read-only` treatments are distinct on purpose. Disabled
 * says "not available to you"; read-only says "real, current, and not yours to
 * change" — a payout already paid, say. Rendering both as the same grey erases
 * a difference the operator needs.
 *
 * That read-only treatment is matched on the ATTRIBUTE (`[readonly]`), never on
 * the `:read-only` pseudo-class, and the difference is not cosmetic. Per HTML,
 * `:read-write` only ever matches a mutable input/textarea or a contenteditable
 * element — a `<select>` is not in that set, so `select:read-only` matches
 * EVERY select, always. Written the obvious way (`read-only:…`), this rule
 * silently repainted every dropdown in the app grey-on-soft and swallowed the
 * gold focus border, while text inputs beside them rendered correctly. It reads
 * as a missing style, not a stray one, which is why it survived a full audit.
 */
const BASE =
  "w-full border bg-clip-padding font-normal text-ink transition-[border-color,background-color] duration-150 " +
  "placeholder:text-ink-faint " +
  // Focus does not repaint a rejected field's edge. The gold border and the red
  // one are the same weight, so on an invalid field the winner was emission
  // order — and focusing the field an error message points at is precisely when
  // that edge has to keep saying "this one". The outline below is the focus
  // signal and is untouched, so nothing is lost by leaving the border to the
  // error.
  "[&:focus:not([aria-invalid='true'])]:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "[&[readonly]]:border-border [&[readonly]]:bg-surface-soft [&[readonly]]:text-ink-muted";

/** Fill, edge and padding — the part that says which surface it sits on. */
const TONE: Record<ControlTone, string> = {
  field: "rounded-lg border-border-strong bg-surface px-[14px] py-[11px]",
  inline: "rounded-lg border-control-edge bg-surface-soft px-3 py-[9px]",
  compact: "rounded-sm border-control-edge bg-surface px-1.5 py-2",
};

const SIZE: Record<ControlSize, string> = {
  xs: "text-xs",
  sm: "text-base",
  md: "text-md",
};

/**
 * V7 has no error style of its own, so this follows the house error semantics.
 *
 * Three single-class rules, which makes this the weakest thing in the file — and
 * every picker state below outranks it, because each needs a pseudo-class or an
 * attribute to beat `TONE`. Left alone, that inverts exactly when it matters: a
 * field holding a rejected answer paints gold, the colour this form uses to mean
 * *this is your answer*, while the message underneath says it is not. A single
 * typed space reaches it — the value is truthy so the field reads as filled, and
 * `.trim().min(1)` rejects it.
 *
 * So the picker states are guarded on `:not([aria-invalid='true'])` rather than
 * this being made heavier by luck: raising the error's specificity alone would
 * win the pixel and leave a control that is simultaneously "answered" and
 * "wrong" in its own selectors. Matched on `="true"` and not merely on the
 * attribute's presence, so a future `aria-invalid="false"` cannot silently
 * suppress the gold.
 *
 * The error itself is keyed on the attribute too, and that half is a fix rather
 * than a guard: written as three bare classes it tied with `TONE` on every
 * property, and ties are settled by whichever utility Tailwind happens to emit
 * later. `border-red` won that coin toss and `bg-red-light` lost it, so every
 * rejected field on the site has been drawing a red edge around an unchanged
 * white fill — half the error treatment, silently, since the recipe was written.
 * Every control that takes `invalid` also sets `aria-invalid`, so keying on it
 * costs nothing and settles the tie by rule instead of by emission order.
 */
const INVALID =
  "[&[aria-invalid='true']]:border-red " +
  "[&[aria-invalid='true']]:bg-red-light " +
  "[&[aria-invalid='true']]:text-ink";

/** Each family's natural type size, so a call site only names the exception. */
const DEFAULT_SIZE: Record<ControlTone, ControlSize> = { field: "md", inline: "xs", compact: "sm" };

/**
 * The class list for a text input, textarea, select, or any of the typed
 * inputs (email, tel, number, date, time, password, search).
 *
 * They share one recipe because V7 measures them identically — the type
 * changes the keyboard and the validation, not the appearance.
 */
export function controlClass({ tone = "field", size, invalid, className }: ControlOptions = {}): string {
  return [BASE, TONE[tone], SIZE[size ?? DEFAULT_SIZE[tone]], invalid ? INVALID : "", className]
    .filter(Boolean)
    .join(" ");
}

/**
 * A form dropdown, speaking the same two states as the pick-one buttons it sits
 * under (client, 2026-08-17).
 *
 * The waitlist form asks "Who is this for?" with three pill buttons directly
 * above these dropdowns, and they already define the vocabulary:
 *
 *   unchosen, hovered → `hover:border-gold-border hover:text-ink`  — edge only
 *   chosen            → `border-gold-border bg-gold-light text-gold-dark`
 *
 * So on this form `bg-gold-light` already means *this is your answer*. Filling a
 * dropdown with it on hover — the first thing tried here — put the answered
 * colour on the pointer, which made an unanswered field look answered and made
 * the two dropdowns disagree with the three buttons an inch above them. Hover is
 * the lighter of the two signals, so it gets the lighter treatment.
 *
 * Hovering therefore moves the edge, and answering fills. A dropdown now reads
 * the way the buttons do, and the form has one language instead of two.
 *
 * `enabled:` keeps a disabled control from responding to a pointer that cannot
 * use it. Tailwind v4 already scopes `hover:` to `@media (hover: hover)`, so a
 * tap leaves nothing stuck on a touch device, and the fade is free — BASE
 * transitions both border and background colour.
 *
 * Focus is deliberately untouched and still outranks both: BASE gives it a solid
 * gold border plus a 2px offset outline, which is the stronger signal it should
 * be.
 */
const PICKER_HOVER = "[&:enabled:hover:not([aria-invalid='true'])]:border-gold-border";

/**
 * The answered treatment, matched to the audience buttons' chosen state.
 *
 * Keyed to the checked option having a real value, so it arrives with the answer
 * and leaves if the placeholder is chosen again — no state to keep in step, and
 * it does not depend on a placeholder existing.
 *
 * Written out three times rather than built from a shared selector because
 * Tailwind scans source text: a class assembled by concatenation compiles to
 * nothing and fails silently at runtime, which is the rule this file's header
 * already records. `:has()` also carries the specificity over `TONE.field`'s
 * single-class border and background.
 *
 * `text-gold-dark` on `bg-gold-light` is 5.15:1 — the pairing the palette was
 * darkened for, and the reason it is never `text-gold`.
 */
const SELECT_ANSWERED =
  "[&:has(option:checked:not([value=''])):not([aria-invalid='true'])]:border-gold-border " +
  "[&:has(option:checked:not([value=''])):not([aria-invalid='true'])]:bg-gold-light " +
  "[&:has(option:checked:not([value=''])):not([aria-invalid='true'])]:text-gold-dark";

/**
 * The same answered treatment for a control that is typed into rather than
 * picked from — the city and state pickers.
 *
 * Keyed to `data-filled`, which the field sets from its own value, rather than
 * to `:not(:placeholder-shown)`. The placeholder trick reads as the tidier CSS
 * and carries a trap: a caller that omits the placeholder never matches
 * `:placeholder-shown`, so the negation is true from the first paint and an
 * empty field renders as answered. Keying on the value cannot be wrong that way.
 *
 * The attribute selector also carries the specificity over `TONE.field`'s
 * single-class border and background, the same job `:has()` does above.
 */
const COMBO_ANSWERED =
  "[&[data-filled]:not([aria-invalid='true'])]:border-gold-border " +
  "[&[data-filled]:not([aria-invalid='true'])]:bg-gold-light " +
  "[&[data-filled]:not([aria-invalid='true'])]:text-gold-dark";

/**
 * A control that suggests from a list but accepts anything — an `<input list>`
 * over a `<datalist>`, which is what the city and state pickers are.
 *
 * It wears the dropdown's states because it is one to the person using it: the
 * edge goes gold under the pointer, and a filled field carries the answered
 * treatment, so City and State read the same as Topic and Group size beside
 * them.
 *
 * The suggestion panel is the part that cannot follow. A datalist's popup is
 * drawn by the browser and has no pseudo-element to reach — unlike a `<select>`,
 * which `appearance: base-select` hands over as real DOM. So this styles the
 * field completely and the panel not at all. The alternative is a hand-built
 * combobox, which buys the panel and owes keyboard navigation, filtering, the
 * mobile case and the ARIA a datalist gives for free.
 */
export function comboClass(options: ControlOptions = {}): string {
  return controlClass({
    ...options,
    className: `${PICKER_HOVER} ${COMBO_ANSWERED} ${options.className ?? ""}`.trim(),
  });
}

/**
 * A `<select>`. Identical to `controlClass` plus the pointer affordance.
 *
 * The chevron is left to the browser deliberately. V7 does the same, and a
 * hand-drawn one means re-implementing the open state, the disabled state and
 * the right-to-left case for no gain.
 *
 * Both treatments apply to every tone (client, 2026-08-18) — they were
 * `field`-only at first, on the theory that a gold fill down a console
 * table's status column would read as a status colour and a hover edge
 * would compete with the row hover those tables already draw. Trialled on
 * the console's Month/Year filter first and confirmed live: the console
 * reads the fill the same way the landing form does — "this is what's
 * chosen" — so the exclusion was dropped rather than kept as an unused
 * escape hatch.
 */
export function selectClass(options: ControlOptions = {}): string {
  // `form-select` is a hook, not a style: the open list lives in a pseudo-element
  // (`::picker(select)`) that no utility class can reach, so globals.css styles
  // it and needs a selector to aim at. It carries no properties of its own.
  return controlClass({
    ...options,
    className: `cursor-pointer form-select ${PICKER_HOVER} ${SELECT_ANSWERED} ${options.className ?? ""}`.trim(),
  });
}

/**
 * A checkbox or radio.
 *
 * Small on purpose, and exempt from the 44px floor for the reason recorded in
 * `globals.css`: forcing a 15px control to 44px fights its own design. The tap
 * target belongs to the label that wraps it — `checkboxLabelClass` is that
 * label, and the two are exported together so a call site cannot take one and
 * forget the other.
 */
export const checkboxClass = "h-[15px] w-[15px] shrink-0 accent-gold";

/** The wrapping label that carries the checkbox's tap target and its text. */
export const checkboxLabelClass =
  "flex cursor-pointer items-start gap-2.5 text-sm leading-[1.6] text-ink-muted [@media(any-pointer:coarse)]:min-h-11";

/** The text above a control. */
export const labelClass = "mb-[5px] block text-xs font-semibold text-ink";

/** The quiet line under a control that explains rather than corrects. */
export const helperClass = "mt-1 text-3xs text-ink-faint";

/**
 * The line under a control that corrects.
 *
 * Always paired with `role="alert"` at the call site: an error that appears
 * silently is an error a screen-reader user does not know about.
 */
export const errorClass = "mt-1 text-xs text-red";

/** The mark that says a field must be filled. */
export const requiredMarkClass = "text-red";
