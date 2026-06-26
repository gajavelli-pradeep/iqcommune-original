import type { CSSProperties } from "react";

// Single source of truth for native <select> coloring across the whole site.
// The gold chevron's stroke is var(--gold-dark) (#8a6510), but SVG data-URIs
// cannot resolve var() (CLAUDE.md gotcha) — so this is the ONE place that hex
// is allowed to appear. Everything else references design tokens.
const CHEVRON_GOLD =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/** `background` shorthand: gold chevron over paper, `offsetPx` from the right edge. */
export function selectChevronBg(offsetPx = 12): string {
  return `${CHEVRON_GOLD} no-repeat right ${offsetPx}px center, var(--input-paper)`;
}

/** Native-select reset — strips the OS arrow; spread over any base field style. */
export const selectReset: CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
};

/** Compact tokenized select for admin data tables (status / method / assign cells). */
export const compactSelectStyle: CSSProperties = {
  ...selectReset,
  fontSize: 12,
  padding: "5px 22px 5px 8px",
  borderRadius: 6,
  border: "1px solid var(--border-input)",
  background: selectChevronBg(7),
  color: "var(--ink)",
  fontFamily: "inherit",
};
