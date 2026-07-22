import { describe, expect, it } from "vitest";

import { MAX_HITS, MIN_QUERY, hit, matchHits } from "@/features/console/search";

/**
 * The console's global search. V7 ships this as a stub that toasts the query
 * back at you, so there is no reference behaviour to clone — these are the
 * rules the implementation chose, pinned so they cannot drift.
 */

const INDEX = [
  hit("practitioners", "p1", "Priya Sharma", "Practitioner · Empanelled", [
    "IQC-PR-0007",
    "priya@example.com",
    "Mumbai",
    "Maharashtra",
  ]),
  hit("practitioners", "p2", "Vikram Rao", "Practitioner · Pending", [
    "vikram@example.com",
    "Mumbai",
  ]),
  hit("requests", "r1", "Anita Desai", "Session request · Pune · New", [
    "Nirvana Corp",
    "anita@example.com",
    "Retirement planning",
  ]),
  hit("sessions", "s1", "IQC-SES-0012", "Session · 14 Aug 2026 · Confirmed", [
    "Priya Sharma",
    "Nirvana Corp",
  ]),
];

describe("console search", () => {
  it("matches on any indexed field, not just the title", () => {
    // An operator searching a reference number or an email is the common case;
    // they rarely have the exact display name to hand.
    expect(matchHits(INDEX, "IQC-PR-0007").hits.map((entry) => entry.rowKey)).toEqual(["p1"]);
    expect(matchHits(INDEX, "anita@example.com").hits.map((entry) => entry.rowKey)).toEqual(["r1"]);
    expect(matchHits(INDEX, "Nirvana").hits.map((entry) => entry.rowKey)).toEqual(["r1", "s1"]);
  });

  it("ignores case and matches partial words", () => {
    expect(matchHits(INDEX, "priya").hits.map((entry) => entry.rowKey)).toEqual(["p1", "s1"]);
    expect(matchHits(INDEX, "SHAR").hits.map((entry) => entry.rowKey)).toEqual(["p1", "s1"]);
  });

  it("requires every word to match, so more words narrow", () => {
    // The words are one description of one record, not alternatives. OR-matching
    // would put every Mumbai practitioner beside the one actually meant.
    expect(matchHits(INDEX, "mumbai").hits).toHaveLength(2);
    expect(matchHits(INDEX, "vikram mumbai").hits.map((entry) => entry.rowKey)).toEqual(["p2"]);
    expect(matchHits(INDEX, "vikram pune").hits).toEqual([]);
  });

  it("stays quiet below the minimum query length", () => {
    // One character matches most of the index; the list would be noise.
    expect(MIN_QUERY).toBe(2);
    expect(matchHits(INDEX, "p").hits).toEqual([]);
    expect(matchHits(INDEX, "  ").hits).toEqual([]);
    expect(matchHits(INDEX, "").hits).toEqual([]);
  });

  it("reports what it truncated instead of silently capping", () => {
    const many = Array.from({ length: MAX_HITS + 5 }, (_, index) =>
      hit("practitioners", `x${index}`, `Test Person ${index}`, "Practitioner · Empanelled", []),
    );
    const result = matchHits(many, "test person");

    expect(result.hits).toHaveLength(MAX_HITS);
    // A capped list that looks complete is how an operator concludes a record
    // does not exist.
    expect(result.overflow).toBe(5);
  });

  it("reports no overflow when everything fits", () => {
    expect(matchHits(INDEX, "priya").overflow).toBe(0);
  });

  it("returns nothing rather than everything when a word matches nothing", () => {
    expect(matchHits(INDEX, "zzzz").hits).toEqual([]);
    expect(matchHits(INDEX, "priya zzzz").hits).toEqual([]);
  });

  it("carries the tab and row key needed to open the record", () => {
    const [found] = matchHits(INDEX, "anita").hits;
    expect(found).toMatchObject({ tab: "requests", rowKey: "r1", title: "Anita Desai" });
  });

  it("drops empty fields rather than padding the haystack with them", () => {
    // Null/undefined columns are ordinary here (no organisation, no state). If
    // they landed in `terms` as "null", searching "null" would match them.
    const sparse = hit("practitioners", "p9", "No Extras", "Practitioner · Pending", [
      null,
      undefined,
      "",
    ]);
    expect(sparse.terms).toBe("no extras practitioner · pending");
    expect(matchHits([sparse], "null").hits).toEqual([]);
    expect(matchHits([sparse], "undefined").hits).toEqual([]);
  });
});
