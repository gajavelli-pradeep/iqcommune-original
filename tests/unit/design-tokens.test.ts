import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every design-token utility must resolve to a token that exists.
 *
 * `text-on-dark-faint` shipped in the widget kit and rendered *nothing* —
 * Tailwind emits no rule for an undefined token, so the text silently fell back
 * to inherited dark-on-dark and three labels were invisible in the running app.
 * Lint could not catch it: the ESLint guard bans raw hex, and a phantom token
 * contains no hex. Typecheck could not catch it: it is a string.
 *
 * The first version of this test only checked colours whose names began with a
 * known prefix, and promptly missed `bg-scrim` and `shadow-lift` on the very
 * next component. So it now works the other way round: each utility namespace is
 * checked against the CSS variable namespace it actually reads from, and
 * anything unrecognised must be explicitly known-good rather than assumed so.
 */

const SOURCE_DIRS = ["app", "components", "features", "hooks", "lib", "services", "utils"];

/** Utility prefix → the `--<namespace>-*` variables Tailwind resolves it against. */
const NAMESPACES: Record<string, string[]> = {
  bg: ["color"],
  text: ["color", "text"],
  border: ["color"],
  fill: ["color"],
  stroke: ["color"],
  accent: ["color"],
  ring: ["color"],
  outline: ["color"],
  shadow: ["shadow"],
  tracking: ["tracking"],
  "max-w": ["container"],
};

/**
 * `border-l-gold` and `border-b-0` are the same utility with a side inserted.
 * Strip the side so the token itself is what gets checked.
 */
const SIDES = /^(t|b|l|r|x|y|s|e)-/;

/**
 * Values Tailwind provides itself, or that belong to a numeric/keyword scale
 * rather than a project token. Anything not here and not a token fails.
 */
const BUILT_IN = new Set([
  "transparent", "current", "inherit", "black", "white", "none", "auto", "full",
  "left", "right", "center", "justify", "start", "end", "top", "bottom",
  "wrap", "nowrap", "balance", "pretty", "clip", "ellipsis",
  "solid", "dashed", "dotted", "double", "hidden", "visible", "scroll",
  "x", "y", "t", "b", "l", "r", "s", "e", "px", "0",
  "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "2xs", "3xs",
  "normal", "tight", "tighter", "wide", "wider", "widest", "snug", "relaxed", "loose",
  // Appears inside arbitrary values such as transition-[background,border-color].
  "color",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function definedVariables(): Set<string> {
  const css = readFileSync("app/globals.css", "utf8");
  return new Set([...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

describe("design tokens", () => {
  const variables = definedVariables();

  it("reads a plausible number of variables from globals.css", () => {
    // Guards the guard: a regex that stopped matching would make this vacuous.
    expect(variables.size).toBeGreaterThan(40);
    expect(variables.has("color-gold")).toBe(true);
    expect(variables.has("shadow-modal")).toBe(true);
    expect(variables.has("container-page")).toBe(true);
  });

  it("has no utility pointing at a token that does not exist", () => {
    const prefixes = Object.keys(NAMESPACES).join("|");
    const pattern = new RegExp(`\\b(${prefixes})-([a-z][a-z0-9-]*)\\b`, "g");
    const offences: string[] = [];

    for (const dir of SOURCE_DIRS) {
      for (const file of sourceFiles(dir)) {
        // Comments discuss CSS properties in prose ("border-radius: 100px");
        // only real class lists are being checked here.
        const source = readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/(^|[^:])\/\/.*$/gm, "$1");

        for (const [, prefix, raw] of source.matchAll(pattern)) {
          const value = prefix === "border" || prefix === "outline" ? raw.replace(SIDES, "") : raw;
          // Numeric utilities are Tailwind's own scale (border-2, outline-offset-2).
          if (BUILT_IN.has(value) || /^\d/.test(value) || value.startsWith("offset-")) continue;
          if (NAMESPACES[prefix].some((namespace) => variables.has(`${namespace}-${value}`))) {
            continue;
          }
          offences.push(`${file}: ${prefix}-${raw} → no --{${NAMESPACES[prefix]}}-${value}`);
        }
      }
    }

    expect(offences, [...new Set(offences)].join("\n")).toEqual([]);
  });
});
