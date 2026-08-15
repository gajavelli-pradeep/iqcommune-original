import { describe, expect, it } from "vitest";

import {
  describeMissing,
  missingConfirmationFields,
  type ConfirmationSession,
} from "./confirmation-fields";

/**
 * The guard that stops a confirmation being generated with holes in it.
 *
 * Worth testing rather than trusting because the failure it prevents is silent
 * on every surface: the panel rendered "Pending from SPOC" and an em dash where
 * values were missing, the PDF substituted "To be confirmed", and the document
 * went to a practitioner looking complete. Nothing errored, so nothing revealed
 * that the terms being consented to were not known.
 */

const complete: ConfirmationSession = {
  session_date: "2026-09-01",
  module: "Equity Investing Simplified",
  city: "Mumbai",
  state: "Maharashtra",
  venue: "Kotak Securities, BKC",
  participants: "16-25",
  spoc_name: "Rahul Mehta",
  audience: "corporate",
};

const assignment = (session: Partial<ConfirmationSession>, grossPayout: number | null = 12000) => ({
  gross_payout: grossPayout,
  session: { ...complete, ...session },
});

describe("what a confirmation needs before it can be generated", () => {
  it("passes a session with every value present", () => {
    expect(missingConfirmationFields(assignment({}), null)).toEqual([]);
  });

  it("names each empty field under the label the panel shows", () => {
    // Not column names: an admin told "spoc_name is empty" goes looking for a
    // control that does not exist.
    expect(missingConfirmationFields(assignment({ venue: null }), null)).toEqual(["Venue"]);
    expect(missingConfirmationFields(assignment({ participants: null }), null)).toEqual([
      "Participant count",
    ]);
    expect(missingConfirmationFields(assignment({ spoc_name: null }), null)).toEqual(["SPOC name"]);
    expect(missingConfirmationFields(assignment({ module: null }), null)).toEqual([
      "Module confirmed for",
    ]);
    expect(missingConfirmationFields(assignment({ state: null }), null)).toEqual(["State"]);
  });

  it("treats whitespace as empty", () => {
    // A pencil edit saving a space would otherwise satisfy the check and print
    // a blank on the document.
    expect(missingConfirmationFields(assignment({ venue: "   " }), null)).toEqual(["Venue"]);
  });

  it("accepts the date from the form when the record has none", () => {
    // The admin enters the date on this very screen, so a session that has not
    // been scheduled yet is confirmable — as long as they supply one now.
    expect(missingConfirmationFields(assignment({ session_date: null }), "2026-09-01")).toEqual([]);
    expect(missingConfirmationFields(assignment({ session_date: null }), null)).toEqual([
      "Session date",
    ]);
    expect(missingConfirmationFields(assignment({ session_date: null }), "  ")).toEqual([
      "Session date",
    ]);
  });

  it("counts a zero payout as missing, not as free", () => {
    // This document states what the practitioner is paid. Zero is not a term
    // anyone agrees to; it is a value nobody filled in.
    expect(missingConfirmationFields(assignment({}, 0), null)).toEqual(["Agreed gross payout"]);
    expect(missingConfirmationFields(assignment({}, null), null)).toEqual(["Agreed gross payout"]);
    expect(missingConfirmationFields(assignment({}, 1), null)).toEqual([]);
  });

  it("reports every gap at once, not one per attempt", () => {
    // Order is the panel's, top to bottom, so an admin reading the message
    // works down the form rather than hunting for each name in turn.
    const missing = missingConfirmationFields(
      assignment({ venue: null, participants: null, state: null }, 0),
      null,
    );
    expect(missing).toEqual(["Venue", "State", "Participant count", "Agreed gross payout"]);
  });

  it("refuses outright when the session has gone", () => {
    expect(missingConfirmationFields({ gross_payout: 12000, session: null }, "2026-09-01")).toEqual([
      "Session",
    ]);
  });
});

describe("the message an admin reads", () => {
  it("reads as a sentence for one field", () => {
    expect(describeMissing(["Venue"])).toContain("Venue is still empty");
  });

  it("joins several without a trailing comma", () => {
    expect(describeMissing(["Venue", "State", "SPOC name"])).toContain(
      "Venue, State and SPOC name are still empty",
    );
  });

  it("says why, not just what", () => {
    // "Venue is required" tells an admin to fill a box. This tells them the
    // document is a set of terms, which is why a blank one cannot go out.
    expect(describeMissing(["Venue"])).toContain("terms a practitioner consents to");
  });
});
