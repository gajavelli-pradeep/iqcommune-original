import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Token guards.
 *
 * The previous codebase accumulated ~1,575 inline `style={{}}` blocks with raw
 * hex and raw pixel values, which is why its lint ran at `--max-warnings 1455`.
 * These two rules are `error` from the first commit so that debt cannot start:
 * a colour or size with no token is a signal to add a token, never to inline a
 * literal.
 *
 * Both are scoped to source files — config, tests and the Satori OG image are
 * exempt below, since Satori genuinely cannot resolve `var()`.
 */
const tokenGuards = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
      message:
        "Raw hex colour. Use a token from app/globals.css — var(--color-ink), var(--color-gold-dark) for gold text on light, etc. No token yet? Add one.",
    },
    {
      selector:
        "Literal[value=/^(?:rgb|rgba|hsl|hsla)\\(/]",
      message:
        "Raw colour function. Use a token from app/globals.css instead of an inline rgba()/hsl().",
    },
    {
      selector:
        "Property[key.name=/^(padding|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap|fontSize|borderRadius|lineHeight|letterSpacing)$/] > Literal[value=/^-?[0-9.]+(px|rem|em)$/]",
      message:
        "Raw size literal in a style object. Use a token — var(--text-base), var(--radius-lg), var(--spacing) — or a Tailwind utility backed by one.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "features/**/*.{ts,tsx}"],
    rules: tokenGuards,
  },
  {
    // Satori (OG image generation) cannot resolve CSS custom properties, so
    // literals there are correct rather than sloppy.
    files: ["app/**/opengraph-image.tsx", "app/**/twitter-image.tsx"],
    rules: { "no-restricted-syntax": "off" },
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
