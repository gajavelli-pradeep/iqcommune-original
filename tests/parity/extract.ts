import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Content-parity extraction — BUILD-PLAN.md F4.
 *
 * Turns a V7 spec file and a rendered route into two comparable bags of text,
 * so "did we miss any copy?" becomes a failing test instead of a worry.
 *
 * The comparison is deliberately one-directional and substring-based. A spec
 * string must appear *somewhere* in the rendered output; the rendered output is
 * allowed to contain more (a11y text, visually-hidden labels). Anything
 * stricter fails on formatting differences that carry no meaning.
 */

const SPEC_DIR = resolve(
  process.cwd(),
  "..",
  "client_requirements",
  "thefinalfinalfiles (V7)",
);

/** Attributes that carry user-visible copy rather than markup plumbing. */
const TEXT_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt", "value"];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  times: "×",
  middot: "·",
  deg: "°",
  eacute: "é",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * One normalisation used on both sides of the diff. Typographic variants are
 * folded because a spec written with a curly apostrophe and a component written
 * with a straight one say the same thing to a reader.
 */
export function normalize(value: string): string {
  return decodeEntities(value)
    .replace(/[   ]/g, " ")
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Noise: pure punctuation, bare numbers, and fragments too short to be copy. */
function isMeaningful(value: string): boolean {
  return value.length >= 3 && /[a-z]{2}/i.test(value);
}

/**
 * Visible strings from a static V7 spec file.
 *
 * `<script>` and `<style>` bodies are removed wholesale — script *source* is not
 * copy. Copy that a script injects into the DOM is a known blind spot of this
 * extractor and is handled by declaring it in `pending.ts`, never by silently
 * missing it.
 */
export interface SpecString {
  text: string;
  /** 1-based line in the spec file where this string first appears. */
  line: number;
}

/**
 * Same extraction, but each string keeps the line it came from — which lets a
 * pending declaration name a *region of the spec* ("the modules section, lines
 * 802-859") instead of a hand-maintained list of keywords. Keyword lists go
 * stale silently; a line range does not.
 */
export function extractSpecEntries(html: string): SpecString[] {
  // Script, style and comment bodies are blanked *in place* — every character
  // except newlines becomes a space — so line numbers still match the file on
  // disk. Deleting them outright would shift every range.
  const blank = (match: string) => match.replace(/[^\n]/g, " ");
  const withoutCode = html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank);

  const found = new Map<string, number>();
  const remember = (raw: string, line: number) => {
    const text = normalize(raw);
    if (isMeaningful(text) && !found.has(text)) found.set(text, line);
  };

  // Attributes are read before tags are removed, and per line, since an
  // attribute and its value sit on one line even when the tag does not.
  withoutCode.split("\n").forEach((rawLine, index) => {
    for (const attribute of TEXT_ATTRIBUTES) {
      const pattern = new RegExp(`\\b${attribute}\\s*=\\s*"([^"]*)"`, "gi");
      for (const [, value] of rawLine.matchAll(pattern)) remember(value, index + 1);
    }
  });

  // A tag broken across lines would survive line-by-line stripping and be
  // reported as missing copy, so those are blanked first — in place, keeping
  // their newlines, so no line number moves. Single-line tags are then removed
  // per line, where they also serve as the separator between text nodes.
  const masked = withoutCode.replace(/<[^>]*\n[^>]*>/g, blank);
  masked.split("\n").forEach((rawLine, index) => {
    for (const piece of rawLine.replace(/<[^>]*>/g, "\n").split("\n")) {
      remember(piece, index + 1);
    }
  });

  return [...found].map(([text, line]) => ({ text, line }));
}

export function extractSpecStrings(html: string): string[] {
  const withoutCode = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");

  const found = new Set<string>();

  for (const attribute of TEXT_ATTRIBUTES) {
    const pattern = new RegExp(`\\b${attribute}\\s*=\\s*"([^"]*)"`, "gi");
    for (const [, raw] of withoutCode.matchAll(pattern)) {
      const text = normalize(raw);
      if (isMeaningful(text)) found.add(text);
    }
  }

  for (const raw of withoutCode.replace(/<[^>]+>/g, "\n").split("\n")) {
    const text = normalize(raw);
    if (isMeaningful(text)) found.add(text);
  }

  return [...found];
}

export function readSpec(filename: string): string {
  try {
    return readFileSync(resolve(SPEC_DIR, filename), "utf8");
  } catch (cause) {
    throw new Error(
      `Parity spec not readable: ${filename}. The gate cannot pass without its ` +
        `source of truth — a missing spec file is a failure, not a skip. Looked in ${SPEC_DIR}.`,
      { cause },
    );
  }
}

/**
 * Everything a user could read in the rendered route: text plus the attributes
 * that speak to assistive technology.
 */
export function renderedHaystack(container: HTMLElement): string {
  const parts = [container.textContent ?? ""];

  for (const attribute of TEXT_ATTRIBUTES) {
    for (const node of container.querySelectorAll(`[${attribute}]`)) {
      parts.push(node.getAttribute(attribute) ?? "");
    }
  }

  return normalize(parts.join(" "));
}
