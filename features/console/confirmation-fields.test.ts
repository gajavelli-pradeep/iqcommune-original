import { describe, expect, it } from "vitest";

import {
  describeMissing,
  missingConfirmationFields,
  type ConfirmationEntry,
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
  module: "Equity Investing Simplified",
  city: "Mumbai",
  state: "Maharashtra",
  venue: "Kotak Securities, BKC",
  participants: "16-25",
  spoc_name: "Rahul Mehta",
  audience: "corporate",
};

/** A form the admin has filled in completely. */
const filled: ConfirmationEntry = { sessionDate: "2026-09-01", startTime: "10:00", durationHours: 3 };

const assignment = (session: Partial<ConfirmationSession>, grossPayout: number | null = 12000) => ({
  gross_payout: grossPayout,
  session: { ...complete, ...session },
});

const check = (session: Partial<ConfirmationSession>, entry: Partial<ConfirmationEntry> = {}) =>
  missingConfirmationFields(assignment(session), { ...filled, ...entry });

describe("what a confirmation needs before it can be generated", () => {
  it("passes a complete session with a filled-in form", () => {
    expect(check({})).toEqual([]);
  });

  it("names each empty field under the label the panel shows", () => {
    // Not column names: an admin told "spoc_name is empty" goes looking for a
    // control that does not exist.
    expect(check({ venue: null })).toEqual(["Venue"]);
    expect(check({ participants: null })).toEqual(["Participant count"]);
    expect(check({ spoc_name: null })).toEqual(["SPOC name"]);
    expect(check({ module: null })).toEqual(["Module confirmed for"]);
    expect(check({ state: null })).toEqual(["State"]);
  });

  it("treats whitespace as empty", () => {
    // A pencil edit saving a space would otherwise satisfy the check and print
    // a blank on the document.
    expect(check({ venue: "   " })).toEqual(["Venue"]);
  });

  it("counts a zero payout as missing, not as free", () => {
    // This document states what the practitioner is paid. Zero is not a term
    // anyone agrees to; it is a value nobody filled in.
    expect(missingConfirmationFields(assignment({}, 0), filled)).toEqual(["Agreed gross payout"]);
    expect(missingConfirmationFields(assignment({}, null), filled)).toEqual(["Agreed gross payout"]);
    expect(missingConfirmationFields(assignment({}, 1), filled)).toEqual([]);
  });

  it("reports every gap at once, not one per attempt", () => {
    // Order is the panel's, top to bottom: the auto-populated block first, then
    // the three boxes the admin fills in — so an admin reading the message works
    // down the form rather than hunting for each name in turn.
    const missing = missingConfirmationFields(
      assignment({ venue: null, participants: null, state: null }, 0),
      { sessionDate: "", startTime: "", durationHours: 0 },
    );
    expect(missing).toEqual([
      "Venue",
      "State",
      "Participant count",
      "Agreed gross payout",
      "Session date",
      "Start time",
      "Duration",
    ]);
  });

  it("refuses outright when the session has gone", () => {
    expect(missingConfirmationFields({ gross_payout: 12000, session: null }, filled)).toEqual([
      "Session",
    ]);
  });
});

/**
 * The three the admin types. Each is labelled "(admin enters)" and each now
 * opens empty, so each has to be able to fail on its own.
 */
describe("the three fields the admin fills in", () => {
  it("names the date when the box is empty", () => {
    expect(check({}, { sessionDate: "" })).toEqual(["Session date"]);
    expect(check({}, { sessionDate: null })).toEqual(["Session date"]);
    expect(check({}, { sessionDate: "   " })).toEqual(["Session date"]);
  });

  it("names the start time when the pickers were not touched", () => {
    // The panel sends "" rather than a half-built "10:" when only some of the
    // three pickers were used — this is the field being missing, not malformed.
    expect(check({}, { startTime: "" })).toEqual(["Start time"]);
  });

  it("names the duration when nothing was selected", () => {
    // `Number("")` is 0, which is what an untouched picker submits.
    expect(check({}, { durationHours: 0 })).toEqual(["Duration"]);
  });

  it("lists all three when the form is untouched", () => {
    // The whole point: clicking Generate on a fresh form must stop, and must
    // say everything that is wrong in one message.
    expect(check({}, { sessionDate: "", startTime: "", durationHours: 0 })).toEqual([
      "Session date",
      "Start time",
      "Duration",
    ]);
  });

  // Nothing asserts that a stored `session_date` cannot satisfy the date: the
  // field is gone from `ConfirmationSession` entirely, so the function has no
  // way to reach one. A type that makes the mistake unrepresentable beats a
  // test that checks it did not happen.
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
