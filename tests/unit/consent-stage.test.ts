import { describe, expect, it } from "vitest";

import { consentStage, sinceLabel, type StagedRow } from "@/lib/consent-stage";

/**
 * The whole point of the Next step column is that a row is never ambiguous
 * about what it needs, so these walk the sequence a real session takes and pin
 * every fork off it.
 *
 * The terminal states are checked against every combination that could reach
 * them, because those are the ones where getting it wrong asks a practitioner
 * to consent to a session that was cancelled a week ago.
 */

const row = (overrides: Partial<StagedRow> = {}): StagedRow => ({
  status: "Pending",
  sessionStatus: "Pending",
  requestSentAt: null,
  guideSentAt: null,
  ...overrides,
});

const SENT = "2026-08-14T10:00:00.000Z";

describe("the stage a confirmation has reached", () => {
  it("asks for consent when nobody has been asked", () => {
    expect(consentStage(row())).toBe("request");
  });

  it("waits once the request has gone out", () => {
    expect(consentStage(row({ requestSentAt: SENT }))).toBe("waiting");
  });

  it("offers the confirm once consent comes back", () => {
    expect(consentStage(row({ status: "Received", requestSentAt: SENT }))).toBe("confirm");
  });

  it("offers the guide once the session is confirmed", () => {
    expect(consentStage(row({ status: "Received", sessionStatus: "Confirmed" }))).toBe("guide");
  });

  it("has nothing left to ask once the guide has gone", () => {
    expect(
      consentStage(row({ status: "Received", sessionStatus: "Confirmed", guideSentAt: SENT })),
    ).toBe("in-flight");
  });
});

describe("the stages that end the sequence", () => {
  it("stops chasing a cancelled session, whatever else is true of it", () => {
    for (const extra of [
      {},
      { requestSentAt: SENT },
      { status: "Received" as const },
      { status: "Received" as const, guideSentAt: SENT },
    ]) {
      expect(consentStage(row({ ...extra, sessionStatus: "Cancelled" }))).toBe("cancelled");
    }
  });

  it("stops chasing a delivered session, whatever else is true of it", () => {
    for (const extra of [{}, { requestSentAt: SENT }, { status: "Received" as const }]) {
      expect(consentStage(row({ ...extra, sessionStatus: "Completed" }))).toBe("delivered");
    }
  });

  /**
   * The one that matters most. A cancelled session with no consent yet must not
   * fall through to "request" — that would put a Send consent request button on
   * a session nobody is going to run.
   */
  it("never asks for consent on a cancelled session", () => {
    expect(consentStage(row({ sessionStatus: "Cancelled" }))).not.toBe("request");
  });
});

describe("consent gates everything after it", () => {
  /**
   * A session can be marked Confirmed from Session Details without consent ever
   * having come back. When that happens the outstanding consent is still the
   * earlier unmet step, so the row keeps asking for it rather than jumping to
   * the guide — which would tell a practitioner what to shoot at a session they
   * have not agreed to deliver.
   */
  it("keeps chasing consent even when the session says Confirmed", () => {
    expect(consentStage(row({ sessionStatus: "Confirmed", requestSentAt: SENT }))).toBe("waiting");
    expect(consentStage(row({ sessionStatus: "Confirmed" }))).toBe("request");
  });

  it("never offers the guide while consent is outstanding", () => {
    for (const state of [
      row({ sessionStatus: "Confirmed", guideSentAt: SENT }),
      row({ sessionStatus: "Confirmed", guideSentAt: SENT, requestSentAt: SENT }),
    ]) {
      expect(["request", "waiting"]).toContain(consentStage(state));
    }
  });
});

describe("how long ago the request went out", () => {
  const at = (iso: string) => new Date(iso);

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
