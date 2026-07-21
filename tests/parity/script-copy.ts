import { normalize, type SpecString } from "./extract";

/**
 * Copy that lives in a spec's `<script>` rather than its markup.
 *
 * The DOM extractor blanks script bodies, which is right for seven of the eight
 * V7 files and badly wrong for the admin console: roughly 70% of that file's
 * user-facing text is JavaScript — seed data rendered into tables, status
 * dictionaries, `<option>` labels, and HTML built inside template literals. A
 * gate that blanks it reports green while checking a third of the page, which
 * is exactly how the previous rebuild shipped 100 non-matching controls.
 *
 * This is deliberately a *separate* extractor rather than a widening of the
 * first. The rules are different, the false positives are different, and mixing
 * them would make both harder to reason about.
 */

/** Where a string was found, so a failure says what kind of copy went missing. */
export type ScriptStringKind =
  /** Inside a template literal that becomes markup. */
  | "markup"
  /** A value in a seed-data array or a label dictionary. */
  | "data"
  /** An argument to showToast(...) — transient, checked by set rather than by render. */
  | "toast";

export interface ScriptString extends SpecString {
  kind: ScriptStringKind;
}

/**
 * Values that look like copy but are not. Each entry is a real offender from
 * the console spec, not a hypothetical.
 */
const NOT_COPY: ReadonlyArray<RegExp> = [
  /^(https?:|mailto:|\/|\.\/)/, // links
  /^[a-z0-9]+(_[a-z0-9]+)+$/, // storage keys: iqcommune_agreement_submissions
  /^[#.[]/, // selectors
  /^(s|btn|role|pf|pn|pipe|days|sb|kv|prof|req|gal|conf|tw)-[a-z0-9-]+$/, // css classes
  /^[a-z]+(-[a-z0-9]+)+$/, // kebab discriminators: send-agreement, photo-guide
  /^\d{4}-\d{2}-\d{2}/, // ISO timestamps
  /^(none|block|inline|inline-flex|flex|hidden|active|selected|nearest|smooth|currentColor)$/,
  /:\s*(var\(--|\d)/, // inline style declarations
  /^[A-Z][a-z]+ [A-Z]/, // not a filter — kept deliberately permissive; see below
];

/** Same meaningfulness bar as the DOM extractor, plus a copy-shaped check. */
function isCopy(text: string): boolean {
  if (text.length < 3 || !/[a-z]{2}/i.test(text)) return false;
  // A space or sentence punctuation is what separates prose from an identifier.
  // "Screening done" and "Applied on" pass; "sendAgreement" and "s-empanelled"
  // do not, and neither survives the patterns above anyway.
  if (!/[\s.,?!—–:]/.test(text) && !/^[A-Z]/.test(text)) return false;
  return !NOT_COPY.slice(0, -1).some((pattern) => pattern.test(text));
}

/** The `<script>` bodies, blanked in place so line numbers still hold. */
function scriptBodies(html: string): string {
  const blankOutside = (match: string) => match.replace(/[^\n]/g, " ");
  let result = "";
  let cursor = 0;
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    const start = match.index ?? 0;
    const bodyStart = start + match[0].indexOf(">") + 1;
    result += blankOutside(html.slice(cursor, bodyStart));
    result += match[1];
    cursor = bodyStart + match[1].length;
  }
  return result + blankOutside(html.slice(cursor));
}

/**
 * Strings from the script, tagged by kind.
 *
 * Regex rather than an AST: the tradeoff is that a template literal containing
 * a nested backtick inside `${…}` splits into fragments. That is acceptable
 * because each fragment is still checked — the failure mode is a slightly
 * noisier report, not a missed string, which is the right way round for a gate.
 */
export function extractScriptStrings(html: string): ScriptString[] {
  const script = scriptBodies(html);
  const found = new Map<string, ScriptString>();

  const remember = (raw: string, line: number, kind: ScriptStringKind) => {
    const text = normalize(raw);
    if (isCopy(text) && !found.has(text)) found.set(text, { text, line, kind });
  };

  const lineOf = (index: number) => script.slice(0, index).split("\n").length;

  // Markup built inside template literals: strip the tags, keep the text.
  for (const match of script.matchAll(/`([^`]*)`/g)) {
    const body = match[1];
    if (!body.includes("<")) continue;
    const line = lineOf(match.index ?? 0);
    // An interpolation separates two runs of text; treating it as empty would
    // fuse "Move to " and " above once…" into one string that never renders.
    const text = body.replace(/\$\{[^}]*\}/g, "\n").replace(/<[^>]*>/g, "\n");
    for (const piece of text.split("\n")) remember(piece, line, "markup");
  }

  // Quoted strings: seed data, dictionary labels, option text.
  for (const match of script.matchAll(/(['"])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
    remember(match[2], lineOf(match.index ?? 0), "data");
  }

  // Toasts are transient and handler-gated, so they are tagged rather than
  // mixed in — a render-based gate can never see them.
  for (const match of script.matchAll(/showToast\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
    const text = normalize(match[2]);
    found.set(text, { text, line: lineOf(match.index ?? 0), kind: "toast" });
  }

  return [...found.values()];
}
