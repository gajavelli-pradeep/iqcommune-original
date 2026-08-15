import { describe, expect, it } from "vitest";

import { addWorkingDays, expectedPaymentDate, PAYOUT_WORKING_DAYS } from "@/lib/working-days";

/**
 * Clause 3(c) — "Payment will be made within 7 working days of the session
 * date" — is a promise made to a practitioner in a contract they signed, so the
 * date the confirmation prints has to mean the same thing the clause does.
 *
 * The weekend cases are the ones worth pinning: a naive `+7 days` lands the
 * payment earlier than the clause allows whenever a weekend falls inside the
 * window, which is most of the time.
 */

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("working days", () => {
  it("skips the weekend rather than counting it", () => {
    // Thu 13 Aug 2026 + 7 working days = Mon 24 Aug, not Thu 20 Aug.
    expect(iso(addWorkingDays(new Date("2026-08-13T00:00:00Z"), 7))).toBe("2026-08-24");
  });

  it("counts from a Friday into the following week", () => {
    // Fri 14 Aug + 7 working days = Tue 25 Aug.
    expect(iso(addWorkingDays(new Date("2026-08-14T00:00:00Z"), 7))).toBe("2026-08-25");
  });

  it("never lands on a Saturday or Sunday", () => {
    for (let offset = 0; offset < 14; offset += 1) {
      const from = new Date("2026-08-01T00:00:00Z");
      from.setDate(from.getDate() + offset);
      const day = addWorkingDays(from, PAYOUT_WORKING_DAYS).getDay();
      expect([0, 6]).not.toContain(day);
    }
  });

  it("is never earlier than a plain seven days, which is the direction that matters", () => {
    // Being early would promise money sooner than the clause allows.
    const from = new Date("2026-08-13T00:00:00Z");
    const naive = new Date(from.getTime());
    naive.setDate(naive.getDate() + PAYOUT_WORKING_DAYS);
    expect(addWorkingDays(from, PAYOUT_WORKING_DAYS).getTime()).toBeGreaterThanOrEqual(naive.getTime());
  });
});

describe("the expected payment date on a confirmation", () => {
  it("is absent when the session has no date yet", () => {
    // A confirmation can be issued before a date is fixed. Inventing a payment
    // date from a session date that does not exist is worse than no row.
    expect(expectedPaymentDate(null)).toBeNull();
  });

  it("is absent rather than Invalid Date when the stored value is unusable", () => {
    expect(expectedPaymentDate("not a date")).toBeNull();
  });

  it("is seven working days after a real session date", () => {
    expect(iso(expectedPaymentDate("2026-08-13")!)).toBe("2026-08-24");
  });
});
