import { describe, expect, it, vi } from "vitest";

/**
 * Part 2's own list, and specifically the row a session's own cancellation
 * leaves behind (client, 2026-08-18): a confirmation cancelled or deleted
 * alongside the last practitioner on its session used to stay on this table
 * forever, unrestorable — its session is gone, so "put it back" would
 * silently fail — reported as "cancelled data is not removed from Part 2". A
 * confirmation cancelled while its session is still running with other
 * practitioners must still show, restorable, exactly as before.
 */

type Row = Record<string, unknown>;

/** Just enough of the query builder for `listConsents`'s three reads. */
function fakeSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
  );

  function from(table: string) {
    tables[table] ??= [];
    const filters: Array<(row: Row) => boolean> = [];

    const matching = () => tables[table].filter((row) => filters.every((test) => test(row)));

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      // Only usage in this module is `.not(col, "is", null)` — "column is set".
      not: (col: string) => {
        filters.push((row) => (row[col] ?? null) !== null);
        return builder;
      },
      is: (col: string, val: null) => {
        filters.push((row) => (row[col] ?? null) === val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: matching(), error: null }).then(onFulfilled, onRejected),
    };
    return builder;
  }

  return { from };
}

let supabase: ReturnType<typeof fakeSupabase>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabase,
}));

const LIVE_SESSION = {
  id: "s1",
  reference: "IQC-S0001",
  session_date: null,
  status: "Confirmed",
  module: "Equity Investing Simplified",
  venue: "Kotak Securities, BKC",
  deleted_at: null,
};

const VACATED_SESSION = {
  id: "s2",
  reference: "IQC-S0002",
  session_date: null,
  status: "Cancelled",
  module: "Equity Investing Simplified",
  venue: "Kotak Securities, BKC",
  deleted_at: "2026-08-18T00:00:00.000Z",
};

describe("listConsents", () => {
  it("keeps a cancelled confirmation visible while its session is still live", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        {
          id: "a1",
          session_id: "s1",
          confirmation_reference: "IQC-CONF-0001",
          confirmation_generated_at: "2026-08-01T00:00:00.000Z",
          gross_payout: 1000,
          currency: "INR",
          consent_given_at: null,
          deleted_at: "2026-08-17T00:00:00.000Z",
          practitioners: { full_name: "Asha Rao" },
          sessions: LIVE_SESSION,
        },
      ],
      activity_log: [],
    });

    const { listConsents } = await import("./console");
    const rows = await listConsents();

    expect(rows).toHaveLength(1);
    expect(rows[0].confirmationStatus).toBe("Cancelled");
  });

  it("drops a confirmation once its own session has also been vacated", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        {
          id: "a2",
          session_id: "s2",
          confirmation_reference: "IQC-CONF-0002",
          confirmation_generated_at: "2026-08-01T00:00:00.000Z",
          gross_payout: 1000,
          currency: "INR",
          consent_given_at: null,
          deleted_at: "2026-08-18T00:00:00.000Z",
          practitioners: { full_name: "Vikram Kulkarni" },
          sessions: VACATED_SESSION,
        },
      ],
      activity_log: [],
    });

    const { listConsents } = await import("./console");
    const rows = await listConsents();

    expect(rows).toHaveLength(0);
  });

  it("still shows a live, uncancelled confirmation", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        {
          id: "a3",
          session_id: "s1",
          confirmation_reference: "IQC-CONF-0003",
          confirmation_generated_at: "2026-08-01T00:00:00.000Z",
          gross_payout: 1000,
          currency: "INR",
          consent_given_at: null,
          deleted_at: null,
          practitioners: { full_name: "Priya Sharma" },
          sessions: LIVE_SESSION,
        },
      ],
      activity_log: [],
    });

    const { listConsents } = await import("./console");
    const rows = await listConsents();

    expect(rows).toHaveLength(1);
    expect(rows[0].confirmationStatus).toBe("Confirmed");
  });
});
