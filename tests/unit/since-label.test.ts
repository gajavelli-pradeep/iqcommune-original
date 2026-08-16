import { describe, expect, it } from "vitest";

import { sinceLabel } from "@/lib/timestamp";

/**
 * The relative label under a sent consent request.
 *
 * Kept when the stage machine it used to live beside was deleted with Part 2's
 * "Next step" column — the label outlived it, because the row still says how
 * long a request has been waiting.
 */

const SENT = "2026-08-14T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("how long ago the request went out", () => {
  it("reads as just now inside the first minute", () => {
    expect(sinceLabel(SENT, at("2026-08-14T10:00:30.000Z"))).toBe("just now");
  });

  it("counts minutes, then hours, then days", () => {
    expect(sinceLabel(SENT, at("2026-08-14T10:05:00.000Z"))).toBe("5 minutes ago");
    expect(sinceLabel(SENT, at("2026-08-14T13:00:00.000Z"))).toBe("3 hours ago");
    expect(sinceLabel(SENT, at("2026-08-17T10:00:00.000Z"))).toBe("3 days ago");
  });

  it("says one of a thing, not 1 things", () => {
    expect(sinceLabel(SENT, at("2026-08-14T10:01:00.000Z"))).toBe("1 minute ago");
    expect(sinceLabel(SENT, at("2026-08-14T11:00:00.000Z"))).toBe("1 hour ago");
    expect(sinceLabel(SENT, at("2026-08-15T10:00:00.000Z"))).toBe("1 day ago");
  });

  it("rounds down, so a label never claims more time than has passed", () => {
    expect(sinceLabel(SENT, at("2026-08-15T09:59:00.000Z"))).toBe("23 hours ago");
  });
});
