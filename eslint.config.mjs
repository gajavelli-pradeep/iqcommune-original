import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Banned color literals removed in the 2026-06-24 color-psychology remediation.
// These are legacy-ramp / magic hexes that duplicated existing design tokens.
// Re-introducing one is a regression — use the var(--token) noted in the message.
// (Only the known-bad values are listed, so legitimate token-value literals such
//  as "#2a6b2a"/"#185fa5" are NOT flagged.) See COLOR-PSYCHOLOGY-AUDIT.md.
const BANNED_HEX_RE =
  "#(0f1117|080a0e|1a1c22|4a4d5c|9496a1|c9c9c9|e0c870|f0c84a|6fcf6f|b8d98a|f0b0b0)";
const BANNED_RGBA_RE = "rgba\\(15,17,23,"; // cool ink base — use rgba(20,18,12,…)

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    // OG image (Satori) cannot resolve var() — exclude its literal token values.
    ignores: ["app/opengraph-image.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${BANNED_HEX_RE}/i]`,
          message:
            "Banned legacy/magic color hex — use the design token: #0f1117/#080a0e/#1a1c22→var(--ink), #4a4d5c→var(--ink-soft), #9496a1/#c9c9c9→var(--ink-faint), #e0c870→var(--gold-border), #f0c84a→var(--gold-on-ink), #6fcf6f→var(--green-on-ink), #b8d98a→var(--green-border), #f0b0b0→var(--red-border). See COLOR-PSYCHOLOGY-AUDIT.md.",
        },
        {
          selector: `Literal[value=/${BANNED_RGBA_RE}/i]`,
          message:
            "Banned cool ink-base border rgba(15,17,23,…) — use the warm token base rgba(20,18,12,…). See COLOR-PSYCHOLOGY-AUDIT.md.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
