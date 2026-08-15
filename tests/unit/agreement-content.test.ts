import { describe, expect, it } from "vitest";

import {
  AGREEMENT_CLAUSES,
  AGREEMENT_CONSENT_TEXT,
  AGREEMENT_HEADER_FIELDS,
  AGREEMENT_INTRO,
  AGREEMENT_SIGNATURE_FIELDS,
} from "@/constants/agreement";

/**
 * What the signed agreement lost while it was transcribed from the V7 page
 * instead of the client's contract, and must never lose again.
 *
 * These are not style assertions. Each one is a term that was absent from a
 * document a practitioner had already signed: the party they contracted with,
 * the sentence that made the signature consent, and the seat that decides where
 * a dispute is heard.
 */

const everyParagraph = AGREEMENT_CLAUSES.flatMap((clause) => clause.paragraphs).join("\n");

describe("the agreement carries the client's contract, not a summary of it", () => {
  it("names the platform as a party", () => {
    // v2 moved the platform out of its own header row and into the preamble.
    // The assertion follows it rather than being deleted with the row: what
    // matters is that the document names both parties, not where it does so.
    expect(AGREEMENT_INTRO).toContain("InvestQ Commune");
    expect(AGREEMENT_INTRO).toContain("the Platform");
  });

  it("heads the document with the client's four fields, in their order", () => {
    expect(AGREEMENT_HEADER_FIELDS.map((field) => field.key)).toEqual([
      "practitionerName",
      "city",
      "state",
      "empanelmentRef",
    ]);
    // The executed document carries the empanelment number. The onboarding page
    // carries the agreement number instead, and the client's readme says the
    // difference is deliberate — so a header that drifted onto IQC-AGR would be
    // rendering the wrong identifier on the signed copy.
    expect(AGREEMENT_HEADER_FIELDS[3].label).toBe("Empanelment Reference Number");
  });

  it("records who signed, when, and by which method", () => {
    expect(AGREEMENT_SIGNATURE_FIELDS.map((field) => field.label)).toEqual([
      "Signed by",
      "Execution Date",
      "Signature Method",
    ]);
  });

  it("states when the agreement takes effect", () => {
    expect(AGREEMENT_INTRO).toContain("effective as of the date of digital signature");
  });

  it("says what signing means, not merely how it was captured", () => {
    expect(AGREEMENT_CONSENT_TEXT).toContain("agree to be bound by all clauses");
  });

  it("keeps the seat of arbitration, which decides where a dispute is heard", () => {
    expect(everyParagraph).toContain("Hyderabad as the seat of arbitration");
  });

  it("prohibits lead generation, not merely collecting details 'in bulk'", () => {
    expect(everyParagraph).toContain("lead generation exercise");
    expect(everyParagraph).not.toContain("in bulk");
  });

  it("carries all fourteen clauses, 4A included", () => {
    expect(AGREEMENT_CLAUSES).toHaveLength(14);
    expect(AGREEMENT_CLAUSES.map((clause) => clause.title)).toContain(
      "4A. PAYMENT & BILLING PREFERENCES",
    );
  });

  /**
   * The orphan. Clause 4 used to render "(f)" first and (a)–(e) not at all,
   * because the page groups them into a highlight panel and a sub-clause list
   * and the PDF printed the groups in its own order. A lettered sub-clause with
   * no predecessors reads as a drafting error to anyone who opens the file.
   */
  it("orders clause 4's sub-clauses (a) through (f), with none missing", () => {
    const clause = AGREEMENT_CLAUSES.find((entry) => entry.title.startsWith("4."));
    const letters = clause!.paragraphs
      .map((para) => /^\(([a-z])\)/.exec(para)?.[1])
      .filter((letter): letter is string => Boolean(letter));

    expect(letters).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("never lets a lettered sub-clause precede the one before it", () => {
    for (const clause of AGREEMENT_CLAUSES) {
      const letters = clause.paragraphs
        .map((para) => /^\(([a-z])\)/.exec(para)?.[1])
        .filter((letter): letter is string => Boolean(letter));
      expect(letters, clause.title).toEqual([...letters].sort());
    }
  });
});
