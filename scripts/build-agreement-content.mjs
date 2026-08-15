/**
 * Turns the client's agreement JSON into the TypeScript module the app imports.
 *
 * `spec/v7/iqcommune-empanelment-agreement-content.json` is the client's own
 * delivery, and its readme is unusually explicit: *"This is the single source of
 * truth for the Practitioner Empanelment Agreement… render this content as-is,
 * then substitute the dynamic fields."* So nothing here edits, condenses or
 * reorders it — the script exists to move the text, not to interpret it.
 *
 * `constants/agreement.ts` was previously transcribed from the V7 onboarding
 * page, which carries a shortened on-screen summary rather than the contract.
 * That is how the signed PDF came to omit the platform party, the consent
 * sentence and the seat of arbitration, and how clause 4 printed an "(f)" with
 * no (a)–(e) above it: the page groups that clause into a highlight panel and a
 * single sub-clause, and the PDF rendered the groups in its own order.
 *
 * Why generate rather than read the JSON at runtime, same as
 * `build-legal-content.mjs`: Next traces imports to decide what ships in a
 * serverless function and cannot see an `fs.readFile` path, so a runtime read
 * works locally and throws ENOENT in production. An import cannot fail that way.
 *
 * The v2 delivery (2026-08-15) changed the shape as well as the text. The header
 * is no longer a fixed set of rows this script knows the names of — it is four
 * dynamic fields the client lists — and the signature block gained the same
 * treatment. Both are emitted as label/key pairs so the renderer walks the
 * client's list instead of hardcoding one, which is what makes the next header
 * change a JSON edit rather than a code change.
 *
 *   node scripts/build-agreement-content.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "spec/v7/iqcommune-empanelment-agreement-content.json";
const TARGET = "constants/agreement.ts";
const BRAND = "constants/brand.ts";

const content = JSON.parse(readFileSync(path.join(root, SOURCE), "utf8"));

/** A TS string literal, with the client's punctuation left exactly as delivered. */
const literal = (value) => JSON.stringify(value);

/**
 * The tagline is NOT re-emitted here. `constants/brand.ts` already owns it for
 * the session confirmation as well as this document, and two constants holding
 * one line is how the last one drifted. Asserted instead, so a client changing
 * it in the JSON fails this build rather than silently disagreeing with the
 * other document that prints it.
 */
const brandSource = readFileSync(path.join(root, BRAND), "utf8");
const tagline = content.branding?.tagline;
if (!tagline) throw new Error(`${SOURCE} has no branding.tagline`);
if (!brandSource.includes(`BRAND_DOCUMENT_TAGLINE = ${literal(tagline)}`)) {
  throw new Error(
    `${SOURCE} branding.tagline is ${literal(tagline)}, which ${BRAND} does not hold. ` +
      `Update BRAND_DOCUMENT_TAGLINE to match — the confirmation document prints it too.`,
  );
}

/**
 * The keys `lib/pdf/agreement.ts` can resolve to a value.
 *
 * Checked here rather than in the renderer because the renderer's only options
 * at request time are to print a dash or to fail a download — and a contract
 * whose header quietly shows "—" where the client asked for a value is the
 * failure that gets noticed last. A key the code cannot fill should stop the
 * build, where someone is already looking.
 */
const RENDERABLE = new Set([
  "practitionerName",
  "city",
  "state",
  "empanelmentRef",
  "signatureTimestamp",
  "signatureMethod",
]);

/** `{ key, label }` pairs, dropping the client's `dynamic` flag: every field in
 *  both blocks is dynamic in v2, so storing it would only invite a reader to
 *  believe some are not. */
const fields = (list, what) => {
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${SOURCE} has no ${what}`);
  const unknown = list.map((field) => field.key).filter((key) => !RENDERABLE.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `${SOURCE} ${what} names ${unknown.join(", ")}, which lib/pdf/agreement.ts cannot fill. ` +
        `Add the value there and to RENDERABLE in this script before regenerating.`,
    );
  }
  return list
    .map((field) => `  { key: ${literal(field.key)}, label: ${literal(field.label)} },\n`)
    .join("");
};

const clauses = content.clauses
  .map(
    (clause) =>
      `  {\n    title: ${literal(clause.title)},\n    paragraphs: [\n` +
      clause.paras.map((para) => `      ${literal(para)},\n`).join("") +
      `    ],\n  },\n`,
  )
  .join("");

const generated = `/**
 * The empanelment agreement, clause for clause.
 *
 * GENERATED — do not edit. Run \`node scripts/build-agreement-content.mjs\`
 * after changing ${SOURCE}, which is the
 * client's delivery and the only place this text may be edited.
 *
 * Paragraphs are a single flat list per clause because the source is flat. The
 * previous shape split them into \`paragraphs\`, \`subClauses\` and \`highlights\`
 * to mirror how the V7 page styles them, and the PDF then printed the three
 * groups in its own order — which is how clause 4 came to open with "(f)" and no
 * (a)–(e) above it. Order is content in a contract, so there is now only one
 * list and it is the client's.
 */

export interface AgreementClause {
  title: string;
  paragraphs: readonly string[];
}

/**
 * One row of the header or signature block: the client's label, and the key
 * naming the value that fills it. Every one is substituted at render time — see
 * \`dynamicFields\` in the source JSON for what each key means.
 */
export interface AgreementField {
  key: string;
  label: string;
}

/** The document's own heading. */
export const AGREEMENT_DOCUMENT_TITLE = ${literal(content.documentTitle)};

/**
 * The four rows above the preamble: who, where, and which empanelment.
 *
 * The platform is no longer one of them — v2 names it inside \`AGREEMENT_INTRO\`
 * instead, so a header row repeating it would say the same thing twice.
 */
export const AGREEMENT_HEADER_FIELDS: readonly AgreementField[] = [
${fields(content.headerFields, "headerFields")}];

/** Names the parties and the moment the agreement takes effect. */
export const AGREEMENT_INTRO = ${literal(content.introParagraph)};

/**
 * The sentence that makes a signature mean something. It was absent from the
 * PDF entirely, which recorded *how* the practitioner signed but never *what
 * they agreed to* by signing.
 */
export const AGREEMENT_CONSENT_TEXT = ${literal(content.signatureBlock.consentText)};

export const AGREEMENT_SIGNATURE_HEADING = ${literal(content.signatureBlock.heading)};

/** What the execution block records: who signed, when, and by which method. */
export const AGREEMENT_SIGNATURE_FIELDS: readonly AgreementField[] = [
${fields(content.signatureBlock.fields, "signatureBlock.fields")}];

export const AGREEMENT_CLAUSES: readonly AgreementClause[] = [
${clauses}];
`;

writeFileSync(path.join(root, TARGET), generated, "utf8");
console.log(
  `${TARGET} ← ${SOURCE} (${content.clauses.length} clauses, ` +
    `${content.headerFields.length} header fields, ${content.signatureBlock.fields.length} signature fields)`,
);
