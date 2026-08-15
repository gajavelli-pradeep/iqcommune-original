import { describe, expect, it } from "vitest";

import { seedFrom } from "./ConsentPanel";

/**
 * What the time and duration pickers show before the admin touches them.
 *
 * Empty is the answer in every case where the session holds nothing, which is
 * every case today: Part 1 lists only sessions never confirmed, and these two
 * columns are written by the generate action alone. The pickers used to open at
 * 10:00 AM and 3 hours, so an admin could generate without touching the form
 * and send a practitioner a start time nobody had chosen.
 *
 * The midnight and noon rows are why this is a function rather than a modulo
 * written inline at the call site: 00:xx is 12 AM and 12:xx is 12 PM, and the
 * obvious `hour % 12` renders both as "00".
 */

const session = (startTime: string | null, durationMinutes: number | null) =>
  ({ startTime, durationMinutes }) as unknown as Parameters<typeof seedFrom>[0];

const nothing = { hour: "", minute: "", meridiem: "", duration: "" };

describe("seeding the confirmation form", () => {
  it("shows nothing at all when the session holds neither", () => {
    expect(seedFrom(session(null, null))).toEqual(nothing);
    expect(seedFrom(undefined)).toEqual(nothing);
  });

  it("shows the session's own time and duration when it has them", () => {
    // Inheriting a real stored value is not the same as inventing one — a
    // session that genuinely runs at 2pm should say so.
    expect(seedFrom(session("14:30:00", 360))).toEqual({
      hour: "02",
      minute: "30",
      meridiem: "PM",
      duration: "6",
    });
  });

  it("reads midnight as 12 AM and noon as 12 PM", () => {
    expect(seedFrom(session("00:15:00", null))).toMatchObject({ hour: "12", meridiem: "AM" });
    expect(seedFrom(session("12:45:00", null))).toMatchObject({ hour: "12", meridiem: "PM" });
  });

  it("stays empty rather than guessing when the time is unreadable", () => {
    // A malformed value must not become a time. Empty sends the admin to the
    // pickers; "10:00 AM" sends a practitioner a document.
    expect(seedFrom(session("not a time", 180))).toEqual({ ...nothing, duration: "3" });
  });

  it("keeps the duration even when the time is missing", () => {
    // The two are separate columns; one being absent must not discard the other.
    expect(seedFrom(session(null, 360))).toEqual({ ...nothing, duration: "6" });
  });

  it("ignores a stored duration the picker does not offer", () => {
    // The select has exactly two lengths. Seeding "4" matches neither, so the
    // control would show its placeholder while claiming to hold a value.
    expect(seedFrom(session("14:30:00", 240))).toMatchObject({ duration: "", hour: "02" });
  });
});
