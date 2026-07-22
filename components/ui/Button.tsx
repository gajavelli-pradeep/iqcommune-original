import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The one button primitive. Five variants, one per spec `.btn-*` class — the
 * whole point is that collapsing them into a single "PrimaryButton" is what
 * put a gold fill in the header and a resting `shadow-raised` on the hero
 * (audit H3). Each variant carries its FULL visual contract: radius, padding,
 * font size/weight, shadow and hover transform, not just the fill colour.
 *
 * Variants, measured from the seven public V7 files:
 *   primary   — `.btn-primary` (main-landing): INK fill, 100px pill, 15px/600,
 *               resting `shadow-card`, hover lifts to `shadow-raised`. NOT gold:
 *               empanelment.html authors a *gold* `.btn-primary`, a spec
 *               self-contradiction — the landing page is the reference and reuses
 *               ink here, gold only for the closing CTA.
 *   gold      — `.btn-gold` (main-landing): GOLD fill, 100px pill, 16px/600,
 *               `shadow-gold`, hover `brightness(1.1)` + rise.
 *   nav       — `.btn-nav` (header): ink, 14px/500, tighter pill.
 *   nav-ghost — `.btn-nav-ghost` (secondary header): outlined, hover borders
 *               gold on a gold-light wash.
 *   submit    — `.btn-submit`/`.btn-consent`/`.btn-activate` (the flow forms):
 *               full-width ink, 10px radius (NOT a pill), 15px/500, with the
 *               spec's `disabled { opacity: .4 }`.
 *
 * DEVIATION, deliberate — do not "correct" back to the spec: every spec class
 * sets `color:#fff`. On the gold fill (#c9982a) white is 2.3:1 and fails WCAG
 * AA, so `gold` takes an INK label per CLAUDE.md. On the ink fills the label is
 * the surface token (white), so those are unaffected.
 *
 * Hover motion is compositor-only (transform/opacity/filter/shadow swap) and
 * neutralised under `prefers-reduced-motion`. The focus ring is the global one
 * from globals.css `:focus-visible` — not re-declared here.
 */

type Variant = "primary" | "gold" | "nav" | "nav-ghost" | "submit";

const BASE =
  "inline-flex items-center justify-center font-sans transition-[transform,box-shadow,filter,opacity,background-color,border-color] duration-[var(--duration-base)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:brightness-100 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0";

const VARIANTS: Record<Variant, string> = {
  /** `.btn-primary` — hero. Ink, resting `shadow-card`, lifts on hover. */
  primary:
    "rounded-full bg-ink text-surface text-lg font-semibold gap-2 px-[30px] py-3.5 shadow-card hover:-translate-y-0.5 hover:shadow-raised",
  /** `.btn-gold` — closing CTA. Gold fill, INK label (AA deviation, see header). */
  gold: "rounded-full bg-gold text-ink text-xl font-semibold gap-2.5 px-9 py-4 shadow-gold hover:-translate-y-0.5 hover:brightness-110",
  /** `.btn-nav` — header primary. */
  nav: "rounded-full bg-ink text-surface text-md font-medium gap-2 px-[22px] py-2.5 hover:opacity-[0.82]",
  /** `.btn-nav-ghost` — header secondary. Outlined, hover borders gold. */
  "nav-ghost":
    "rounded-full border-[1.5px] border-border-strong text-ink text-md font-medium gap-2 px-[18px] py-2.5 hover:border-gold hover:bg-gold-light",
  /** `.btn-submit` — flow forms. 10px radius, not a pill; disabled dims to .4. */
  submit:
    "w-full rounded-md bg-ink text-surface text-lg font-medium gap-2 p-[0.9rem] hover:opacity-90 disabled:opacity-40",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — there is no default. Pick the spec variant for the call site. */
  variant: Variant;
  /** While true the button is disabled, `aria-busy`, and shows `busyLabel`. */
  busy?: boolean;
  /** Label shown in place of children while busy. */
  busyLabel?: ReactNode;
  /** Stretch to the container. `submit` is already full-width by contract. */
  fullWidth?: boolean;
}

export function Button({
  variant,
  type = "button",
  busy = false,
  busyLabel = "Working…",
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Explicit type: never emit a submit button by accident.
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {busy ? busyLabel : children}
    </button>
  );
}
