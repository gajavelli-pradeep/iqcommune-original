"use client";

import React from "react";

/**
 * The one button.
 *
 * Every button in this repo was hand-typed until now, which is why the console
 * renders 5 distinct button variants on a single tab — including a 32px and a
 * 34px pill nobody chose. Sizes and colours here come from the `--space-*`,
 * `--control-h-*`, `--text-*` and colour tokens in globals.css, so a control can
 * only be one of the sizes the system actually has.
 *
 * Use it for new controls. Existing inline-styled buttons convert when touched —
 * the ESLint guard warns on raw padding/fontSize/borderRadius in a `style={{}}`
 * and the warning budget only ratchets down.
 *
 * Variants are named for what they look like, not for their importance, so they
 * don't collide with `RowActionsInline`'s existing `primary`(=gold) vocabulary:
 *   solid  — ink fill, the page's main commit action
 *   brand  — gold fill with an INK label (white on gold fails AA — never change this)
 *   ghost  — neutral outline, the default
 *   danger — red outline, destructive
 */

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "solid" | "brand" | "ghost" | "danger";

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  /** Fills its container — for stacked mobile layouts and drawer actions. */
  block?: boolean;
}

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { minHeight: "var(--control-h-sm)", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" },
  md: { minHeight: "var(--control-h-md)", padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-sm)" },
  lg: { minHeight: "var(--control-h-lg)", padding: "var(--space-3) var(--space-6)", fontSize: "var(--text-md)" },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  solid: { background: "var(--ink)", color: "var(--surface)", border: "1px solid var(--ink)" },
  brand: { background: "var(--gold)", color: "var(--ink)", border: "1px solid var(--gold)", fontWeight: 600 },
  ghost: { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border-input)" },
  danger: { background: "var(--surface)", color: "var(--red)", border: "1px solid var(--red-border)" },
};

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-2)",
  borderRadius: "var(--radius-pill)",
  fontFamily: "inherit",
  fontWeight: 500,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

export function Button({
  size = "md",
  variant = "ghost",
  block = false,
  disabled,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      // iq-btn carries the coarse-pointer 44px floor from globals.css, so a small
      // button stays tappable on a phone without every caller remembering to.
      className={className ? `iq-btn ${className}` : "iq-btn"}
      style={{
        ...BASE,
        ...SIZES[size],
        ...VARIANTS[variant],
        ...(block ? { width: "100%" } : null),
        ...(disabled ? { opacity: 0.55, cursor: "not-allowed" } : null),
      }}
    >
      {children}
    </button>
  );
}
