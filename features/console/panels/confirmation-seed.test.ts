import { describe, expect, it } from "vitest";

import { seedFrom } from "./ConsentPanel";

/**
 * What the time and duration pickers show before the admin touches them.
 *
 * They read from the session because Part 1 only ever lists sessions that have
 * never been confirmed — so today they always fall back, and the day that
 * changes, an untouched form would quietly re-confirm a 2pm session at 10am.
 *
 * The midnight and noon rows are why this is a function rather than a modulo
 * written inline at the call site: 00:xx is 12 AM and 12:xx is 12 PM, and the
 * obvious `hour % 12` renders both as "00".
 */

const session = (startTime: string | null, durationMinutes: number | null) =>
  ({ startTime, durationMinutes }) as unknown as Parameters<typeof seedFrom>[0];

describe("seeding the confirmation form", () => {
  it("falls back to 10:00 AM and a single module when the session has neither", () => {
    expect(seedFrom(session(null, null))).toEqual({
      hour: "10",
      minute: "00",
      meridiem: "AM",
      duration: "3",
    });
  });

  it("shows the session's own time and duration when it has them", () => {
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

  it("falls back rather than guessing when the time is unreadable", () => {
    // A malformed value must not become 10am silently *and* must not become
    // NaN:NaN — the fallback is the honest answer either way.
    expect(seedFrom(session("not a time", 180))).toMatchObject({ hour: "10", meridiem: "AM" });
    expect(seedFrom(undefined)).toMatchObject({ hour: "10", duration: "3" });
  });

  it("keeps the duration even when the time is missing", () => {
    // The two are separate columns; one being absent must not discard the other.
    expect(seedFrom(session(null, 360))).toMatchObject({ duration: "6", hour: "10" });
  });

  it("ignores a stored duration the picker does not offer", () => {
    // The select has exactly two options. Seeding "4" matches neither, so it
    // renders blank and submits Number("") — a NaN duration on a signed document.
    expect(seedFrom(session("14:30:00", 240))).toMatchObject({ duration: "3", hour: "02" });
  });
});
