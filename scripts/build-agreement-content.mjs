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
 *   node scripts/build-agreement-content.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "spec/v7/iqcommune-empanelment-agreement-content.json";
const TARGET = "constants/agreement.ts";

const content = JSON.parse(readFileSync(path.join(root, SOURCE), "utf8"));

/** A TS string literal, with the client's punctuation left exactly as delivered. */
const literal = (value) => JSON.stringify(value);

const headerValue = (key) => {
  const field = content.headerFields.find((entry) => entry.key === key);
  if (!field) throw new Error(`${SOURCE} has no headerField "${key}"`);
  return field;
};

const platform = headerValue("platformName");
if (platform.dynamic) {
  throw new Error(`"platformName" is marked dynamic in ${SOURCE}; it is rendered as a constant here`);
}

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

/** The document's own heading. */
export const AGREEMENT_DOCUMENT_TITLE = ${literal(content.documentTitle)};

/** The other party. A contract that names only one of its two is not one. */
export const AGREEMENT_PLATFORM_NAME = ${literal(platform.value)};

/** The label the client puts beside it. */
export const AGREEMENT_PLATFORM_LABEL = ${literal(platform.label)};

/** Names the parties and the moment the agreement takes effect. */
export const AGREEMENT_INTRO = ${literal(content.introParagraph)};

/**
 * The sentence that makes a signature mean something. It was absent from the
 * PDF entirely, which recorded *how* the practitioner signed but never *what
 * they agreed to* by signing.
 */
export const AGREEMENT_CONSENT_TEXT = ${literal(content.signatureBlock.consentText)};

export const AGREEMENT_SIGNATURE_HEADING = ${literal(content.signatureBlock.heading)};

export const AGREEMENT_CLAUSES: readonly AgreementClause[] = [
${clauses}];
`;

writeFileSync(path.join(root, TARGET), generated, "utf8");
console.log(`${TARGET} ← ${SOURCE} (${content.clauses.length} clauses)`);
