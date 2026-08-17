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
  "focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold " +
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

/** V7 has no error style of its own, so this follows the house error semantics. */
const INVALID = "border-red bg-red-light text-ink";

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
 * What a form dropdown does under the pointer: `--color-gold-light`, the tint
 * the hero's "Taught by Active Professionals" pill is filled with (client,
 * 2026-08-17).
 *
 * The same token rather than the same value, so the two stay one colour instead
 * of two that happen to match today. At rest the control is untouched — the
 * tint is the affordance, and a dropdown already wearing it has nothing left to
 * say when you point at one.
 *
 * `enabled:` earns its place twice. It keeps a disabled dropdown from lighting
 * up under a pointer that cannot use it, and it carries the specificity:
 * `TONE.field` sets `bg-surface`, and two background rules of equal weight would
 * leave the winner to stylesheet order — where the class list reads correctly
 * either way and only the rendered pixel is wrong.
 *
 * Tailwind v4 already scopes `hover:` to `@media (hover: hover)`, so a tap does
 * not leave a dropdown stuck tinted on a touch device. The fade comes free:
 * BASE already transitions `background-color`.
 *
 * Deliberately not paired with `focus-visible:`, which is the usual rule for a
 * hover affordance. The keyboard path is already served more strongly than a
 * tint would serve it — BASE gives focus a gold border and a 2px offset outline
 * — and putting the fill there too would change the resting appearance of
 * whichever control a keyboard user happens to be sitting on.
 *
 * Ink on this tint measures 14.9:1, so hovering costs nothing in legibility.
 */
const DROPDOWN_HOVER_FILL = "enabled:hover:bg-gold-light";

/**
 * A `<select>`. Identical to `controlClass` plus the pointer affordance.
 *
 * The chevron is left to the browser deliberately. V7 does the same, and a
 * hand-drawn one means re-implementing the open state, the disabled state and
 * the right-to-left case for no gain.
 *
 * The hover tint is `field`-only — the public and flow-page form family, which
 * is the surface it was asked for. The console's `inline` and `compact` selects
 * are in-table editors, where a brand tint under the pointer would compete with
 * the row hover the tables already draw.
 */
export function selectClass(options: ControlOptions = {}): string {
  const hover = (options.tone ?? "field") === "field" ? ` ${DROPDOWN_HOVER_FILL}` : "";
  return controlClass({
    ...options,
    className: `cursor-pointer${hover} ${options.className ?? ""}`.trim(),
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
