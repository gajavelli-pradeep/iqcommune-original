import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every colour class must resolve to a real token.
 *
 * `text-on-dark-faint` shipped in the widget kit and rendered *nothing* —
 * Tailwind emits no rule for an undefined token, so the text silently fell back
 * to inherited dark-on-dark and three labels were invisible in the running app.
 * Lint could not catch it: the ESLint guard bans raw hex, and a phantom token
 * contains no hex. Typecheck could not catch it: it is a string.
 *
 * This closes that gap. A colour utility naming a token that `globals.css` does
 * not define fails the build.
 */

const SOURCE_DIRS = ["app", "components", "features", "hooks", "lib", "services", "utils"];

/** Utilities whose value is a colour token, e.g. `text-`, `bg-`, `border-`. */
const COLOUR_UTILITIES = ["text", "bg", "border", "fill", "stroke", "accent", "ring", "outline"];

/** Tailwind ships these; they are not project tokens and are always valid. */
const BUILT_IN = new Set([
  "transparent",
  "current",
  "inherit",
  "black",
  "white",
  "left",
  "right",
  "center",
  "justify",
  "start",
  "end",
  "wrap",
  "nowrap",
  "balance",
  "pretty",
  "clip",
  "ellipsis",
  "none",
  "auto",
  "solid",
  "dashed",
  "dotted",
  "hidden",
  "visible",
  "scroll",
  "y",
  "x",
  "t",
  "b",
  "l",
  "r",
]);

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function definedTokens(): Set<string> {
  const css = readFileSync("app/globals.css", "utf8");
  return new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

describe("design tokens", () => {
  const tokens = definedTokens();

  it("defines the tokens globals.css is expected to carry", () => {
    // Guards the guard: a regex that stopped matching would make this vacuous.
    expect(tokens.size).toBeGreaterThan(20);
    expect(tokens.has("gold")).toBe(true);
  });

  it("has no colour utility pointing at an undefined token", () => {
    const pattern = new RegExp(`\\b(?:${COLOUR_UTILITIES.join("|")})-([a-z][a-z0-9-]*)\\b`, "g");
    const offences: string[] = [];

    for (const dir of SOURCE_DIRS) {
      for (const file of sourceFiles(dir)) {
        const source = readFileSync(file, "utf8");
        for (const [utility, token] of source.matchAll(pattern)) {
          if (BUILT_IN.has(token) || tokens.has(token)) continue;
          // Only flag names that look like this project's palette; Tailwind's
          // own scales (border-2, text-sm) and layout words are not tokens.
          if (!/^(ink|gold|surface|on-dark|tool|flag|result|seg|green|border)/.test(token)) continue;
          offences.push(`${file}: ${utility} → --color-${token} is not defined`);
        }
      }
    }

    expect(offences, offences.join("\n")).toEqual([]);
  });
});
