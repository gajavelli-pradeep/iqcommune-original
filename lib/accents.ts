// Shared module accent system for the public site.
// One color per finance module, kept consistent across every page so a card for
// "Investment Basics" is always blue, "Retirement Planning" always amber, etc.
// Colors are drawn from the design tokens in app/globals.css.

export interface Accent {
  /** Saturated base — icon stroke, hover border, accent stripes. */
  base: string;
  /** Tint — icon tile / card wash background. */
  light: string;
  /** Readable label color on a light tint. */
  ink: string;
}

/** Accent keyed by the canonical finance-module name. */
export const MODULE_ACCENT: Record<string, Accent> = {
  "Financial Planning Basics": { base: "#2a6b2a", light: "#eef7ee", ink: "#2a6b2a" },
  "Investment Basics": { base: "#185fa5", light: "#e6f1fb", ink: "#185fa5" },
  "Market Fundamentals": { base: "#534ab7", light: "#eeedfe", ink: "#534ab7" },
  "Stock Market Basics": { base: "#c9982a", light: "#f5e9c8", ink: "#8a6510" },
  "Retirement Planning": { base: "#854f0b", light: "#faeeda", ink: "#854f0b" },
  "Goal-Based Investing": { base: "#0f7d8c", light: "#e2f3f5", ink: "#0f7d8c" },
};

/** Ordered palette for cards that aren't module-keyed (audiences, roles). */
export const ACCENT_PALETTE: Accent[] = [
  { base: "#2a6b2a", light: "#eef7ee", ink: "#2a6b2a" },
  { base: "#185fa5", light: "#e6f1fb", ink: "#185fa5" },
  { base: "#534ab7", light: "#eeedfe", ink: "#534ab7" },
  { base: "#c9982a", light: "#f5e9c8", ink: "#8a6510" },
  { base: "#854f0b", light: "#faeeda", ink: "#854f0b" },
  { base: "#0f7d8c", light: "#e2f3f5", ink: "#0f7d8c" },
];

/** Brand gold — fallback when a name isn't in the module map. */
export const FALLBACK_ACCENT: Accent = ACCENT_PALETTE[3];

export const moduleAccent = (name: string): Accent =>
  MODULE_ACCENT[name] ?? FALLBACK_ACCENT;

export const paletteAccent = (i: number): Accent =>
  ACCENT_PALETTE[i % ACCENT_PALETTE.length];

/** Spread onto a card's style to drive the global `--accent` hover rule. */
export const accentVars = (a: Accent): React.CSSProperties =>
  ({ "--accent": a.base } as React.CSSProperties);
