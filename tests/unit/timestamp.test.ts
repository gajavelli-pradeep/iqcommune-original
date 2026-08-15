import { describe, expect, it } from "vitest";

import { formatLiveClock, formatRecordedAt } from "@/lib/timestamp";

/**
 * The bug these pin, in the numbers it actually happened with.
 *
 * An agreement signed at 13:36:58 UTC was printed as "1:36:58 pm" in the PDF —
 * built on Vercel, which runs UTC — while the success page the practitioner
 * signed from showed "7:06 pm", rendered in their own browser. The same instant,
 * five and a half hours apart, with neither surface naming a zone.
 *
 * Both assertions matter. The zone alone is not enough: an unlabelled time is
 * still unusable as evidence, because nobody reading the file later can tell
 * which clock it meant.
 */

const SIGNED_AT = "2026-08-14T13:36:58.000Z";

describe("record timestamps", () => {
  it("renders a UTC instant in IST, not the host's zone", () => {
    expect(formatRecordedAt(SIGNED_AT)).toContain("7:06:58");
  });

  it("names the zone, so the time is evidence rather than a wall clock", () => {
    expect(formatRecordedAt(SIGNED_AT)).toMatch(/\bIST$/);
  });

  it("keeps the date the reader expects across the offset", () => {
    expect(formatRecordedAt(SIGNED_AT)).toContain("14 Aug 2026");
  });

  it("rolls the date forward when the offset crosses midnight UTC", () => {
    // 20:00 UTC is 01:30 the next morning in India — the case where a naive
    // formatter reports the wrong DAY, not merely the wrong hour.
    expect(formatRecordedAt("2026-08-14T20:00:00.000Z")).toContain("15 Aug 2026");
  });

  it("accepts a Date as readily as the stored ISO string", () => {
    expect(formatRecordedAt(new Date(SIGNED_AT))).toBe(formatRecordedAt(SIGNED_AT));
  });

  it("ticks the on-screen clock in the same zone it will be recorded in", () => {
    // Same instant through both functions: the signer must not watch one zone
    // count up and then be handed a receipt in another.
    expect(formatLiveClock(new Date(SIGNED_AT))).toBe(
      formatRecordedAt(SIGNED_AT).replace(/ IST$/, ""),
    );
  });
});
