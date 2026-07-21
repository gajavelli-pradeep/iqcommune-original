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
// V6 clone (2026-07): borders switched to the mockup's COOL ink base app-wide.
// The warm base is now the regression to guard against. See COLOR-PSYCHOLOGY-AUDIT.md.
const BANNED_RGBA_RE = "rgba\\(20,18,12,"; // warm ink base — use rgba(15,17,23,…)

// Size/spacing literals inside a JSX `style={{}}`. Colour has had tokens and this
// guard since 2026-06-24; size had neither, which is how the repo accumulated 162
// distinct padding literals and 5 button variants on a single console tab.
//
// Deliberately `warn`, not `error`: there are ~1,500 pre-existing inline style
// objects and a PR converting them all could not be reviewed. The `lint` script
// pins --max-warnings to the current count, so the number can only go DOWN —
// new code has to use <Button> or a var(--token), old code converts when touched.
const SIZE_PROPS = new Set(["padding", "fontSize", "borderRadius"]);

const noSizeLiterals = {
  meta: {
    type: "suggestion",
    docs: { description: "Size/spacing literals in a JSX inline style must use a token." },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      Property(node) {
        if (node.computed || node.key.type !== "Identifier" || !SIZE_PROPS.has(node.key.name)) return;
        if (node.value.type !== "Literal") return;

        // Only inside a JSX `style={{...}}` — an object literal elsewhere (a chart
        // config, an email template) is not a design-token concern.
        const inStyleAttribute = (source.getAncestors?.(node) ?? context.getAncestors())
          .some((a) => a.type === "JSXAttribute" && a.name?.name === "style");
        if (!inStyleAttribute) return;

        context.report({
          node,
          message:
            `Raw \`${node.key.name}\` literal in an inline style. Use <Button> ` +
            `(components/shared/Button.tsx) for controls, or a size token: ` +
            `var(--space-1..6), var(--control-h-sm|md|lg), var(--text-xs|sm|md|lg), ` +
            `var(--radius-pill). See PLAN-control-size-system.md.`,
        });
      },
    };
  },
};

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
            "Banned warm ink-base border rgba(20,18,12,…) — the V6 clone uses the cool ink base rgba(15,17,23,…). See COLOR-PSYCHOLOGY-AUDIT.md.",
        },
      ],
    },
  },
  {
    // Its own rule name, not a second `no-restricted-syntax` block: flat config is
    // last-one-wins per rule, so reusing that key here would silently disable the
    // colour guard above. A separate rule also lets size warn while colour errors.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/opengraph-image.tsx", "components/shared/Button.tsx"],
    plugins: { iq: { rules: { "no-size-literals": noSizeLiterals } } },
    rules: { "iq/no-size-literals": "warn" },
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
