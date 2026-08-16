import { describe, expect, it } from "vitest";

import { photoRows, type PendingSessionRow, type SubmissionRow } from "@/services/console";

/**
 * Which photos the Photos tab can show.
 *
 * The tab used to be built from completed sessions alone, with photos hung off
 * them. So a practitioner could submit, be told "Photos received", and have the
 * upload be invisible to every admin until it was deleted unseen at the 30-day
 * expiry. It happened to a real submission: IQC-S0007 sat at Confirmed, and
 * neither of its two submissions ever appeared.
 *
 * Every case below is a way photos arrive that the completed-only rule swallowed.
 */

const submission = (over: Partial<SubmissionRow> = {}): SubmissionRow => ({
  id: "sub-1",
  submitter_name: "Vikram Varma",
  session_date: "2026-08-26",
  module_taught: "Equity Investing Simplified",
  storage_keys: ["a.jpg", "b.jpg"],
  created_at: "2026-08-16T12:56:00Z",
  expiry_date: "2026-09-15",
  practitioners: { full_name: "Vikram Varma", reference: "IQC-EMP-0005" },
  sessions: {
    id: "sess-7",
    reference: "IQC-S0007",
    module: "Foundations of Personal Finance",
    city: "Hyderabad",
    session_date: "2026-08-26",
    status: "Confirmed",
    deleted_at: null,
  },
  ...over,
});

const completedSession = (over: Partial<PendingSessionRow> = {}): PendingSessionRow => ({
  id: "sess-3",
  reference: "IQC-S0003",
  module: "Asset Allocation & Portfolio Construction",
  city: "Bengaluru",
  session_date: "2026-06-15",
  status: "Completed",
  session_practitioners: [
    { deleted_at: null, practitioners: { full_name: "Anita Menon", reference: "IQC-EMP-0043" } },
  ],
  photo_submissions: [],
  ...over,
});

describe("photos that arrive before the session is marked Completed", () => {
  it("still gets a row", () => {
    // The reported bug, exactly: photos on a Confirmed session, tab empty.
    const [row] = photoRows([submission()], []);
    expect(row.sessionReference).toBe("IQC-S0007");
    expect(row.photoCount).toBe(2);
  });

  it("says which status the session is actually in", () => {
    // Otherwise the row is unexplained — the tab is meant to be completed-only.
    expect(photoRows([submission()], [])[0].sessionStatus).toBe("Confirmed");
  });

  it("is listed whatever the status, including a cancelled session", () => {
    const cancelled = submission({
      sessions: { ...(submission().sessions as object), status: "Cancelled" } as SubmissionRow["sessions"],
    });
    expect(photoRows([cancelled], [])).toHaveLength(1);
  });
});

describe("two practitioners submitting for one session", () => {
  it("gets a row each", () => {
    // Reading from the session side and picking its first submission rendered
    // one and dropped the other. Both of these are real, live, and expiring.
    const rows = photoRows(
      [
        submission(),
        submission({
          id: "sub-2",
          submitter_name: "Sai Kumar",
          storage_keys: ["c.jpg"],
          practitioners: { full_name: "Sai Kumar", reference: "IQC-EMP-0007" },
        }),
      ],
      [],
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.practitioner)).toEqual(["Vikram Varma", "Sai Kumar"]);
    // Distinct keys, or React renders one of them.
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });
});

describe("photos that name no session at all", () => {
  const loose = submission({ id: "sub-loose", sessions: null, practitioners: null });

  it("is listed rather than lost", () => {
    // The public form on the landing page stores session_id null, so no session
    // status could ever have surfaced these.
    expect(photoRows([loose], [])).toHaveLength(1);
  });

  it("falls back to the name that was typed in", () => {
    const [row] = photoRows([loose], []);
    expect(row.practitioner).toBe("Vikram Varma");
    expect(row.practitionerReference).toBeNull();
    expect(row.module).toBe("Equity Investing Simplified");
  });

  it("marks itself as having no session, not as a status", () => {
    expect(photoRows([loose], [])[0].sessionStatus).toBeNull();
  });

  it("keeps the row when the session was deleted underneath it", () => {
    const orphaned = submission({
      sessions: { ...(submission().sessions as object), deleted_at: "2026-08-10" } as SubmissionRow["sessions"],
    });
    const [row] = photoRows([orphaned], []);
    expect(row.sessionStatus).toBeNull();
    expect(row.photoCount).toBe(2);
  });
});

describe("the queue of sessions still owing photos", () => {
  it("lists a completed session with nothing uploaded", () => {
    const [row] = photoRows([], [completedSession()]);
    expect(row.practitioner).toBe("Anita Menon");
    expect(row.submissionId).toBeNull();
    expect(row.daysLeft).toBeNull();
  });

  it("does not list it twice once photos land", () => {
    const rows = photoRows(
      [submission({ sessions: null })],
      [completedSession({ photo_submissions: [{ id: "sub-1", deleted_at: null }] })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].submissionId).toBe("sub-1");
  });

  it("goes back to owing photos when the submission is deleted", () => {
    const rows = photoRows([], [completedSession({ photo_submissions: [{ id: "x", deleted_at: "2026-07-01" }] })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].submissionId).toBeNull();
  });
});

describe("ordering", () => {
  it("puts the newest session date first", () => {
    // Guards the display-string sort: "03 Jun" vs "15 Jun" compares by day.
    const rows = photoRows(
      [
        submission({ id: "a", sessions: null, session_date: "2026-06-03" }),
        submission({ id: "b", sessions: null, session_date: "2026-06-15" }),
      ],
      [],
    );
    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("puts undated rows last", () => {
    const rows = photoRows(
      [
        submission({ id: "none", sessions: null, session_date: null }),
        submission({ id: "dated", sessions: null, session_date: "2026-06-03" }),
      ],
      [],
    );
    expect(rows.map((row) => row.id)).toEqual(["dated", "none"]);
  });
});
