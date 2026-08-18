import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Delete this record" reported as doing nothing once a session had already
 * been cancelled (client, 2026-08-18). Root cause: cancelling a session's
 * last confirmation already runs `resetSessionForRematch` — soft-deletes the
 * session and reopens its request. Clicking Delete on that same row runs the
 * identical reset a second time, whose own `.is("deleted_at", null)` guard is
 * now unsatisfied, so the update matches nothing — yet the old code returned
 * `{ok: true}` regardless and still logged a "confirmation.deleted" entry for
 * a deletion that did not happen. These pin the fix: Delete must say there is
 * nothing left to do, and must still work correctly on a row that was never
 * cancelled.
 */

const mocks = vi.hoisted(() => ({ requireCapability: vi.fn() }));

vi.mock("./requireRole", () => ({
  requireCapability: mocks.requireCapability,
  // Imported alongside it by the module under test.
  getConsoleSession: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Row = Record<string, unknown>;

/**
 * An in-memory stand-in for every table this file's functions touch, faithful
 * enough on one point that matters here: `.update(...).is(col, null)` only
 * ever affects rows where that column is actually null right now, the same
 * as real Postgres. That is the exact behaviour the reported bug depends on.
 */
function fakeSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
  );

  function from(table: string) {
    tables[table] ??= [];
    const filters: Array<(row: Row) => boolean> = [];
    let updatePatch: Row | null = null;
    let insertRow: Row | null = null;
    let countMode = false;
    let single = false;
    let deleteMode = false;

    const matching = () => tables[table].filter((row) => filters.every((test) => test(row)));

    function resolve() {
      if (insertRow) {
        const row = { ...insertRow };
        tables[table].push(row);
        return { data: row, error: null };
      }
      if (deleteMode) {
        const doomed = new Set(matching());
        tables[table] = tables[table].filter((row) => !doomed.has(row));
        return { data: null, error: null };
      }
      const rows = matching();
      if (updatePatch) for (const row of rows) Object.assign(row, updatePatch);
      if (countMode) return { data: null, error: null, count: rows.length };
      if (single) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    const builder: Record<string, unknown> = {
      select: (_cols: string, opts?: { count?: string }) => {
        if (opts?.count) countMode = true;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      neq: (col: string, val: unknown) => {
        filters.push((row) => row[col] !== val);
        return builder;
      },
      lt: (col: string, val: unknown) => {
        filters.push((row) => (row[col] as string | undefined) !== undefined && (row[col] as string) < (val as string));
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
      update: (patch: Row) => {
        updatePatch = patch;
        return builder;
      },
      insert: (row: Row) => {
        insertRow = row;
        return builder;
      },
      delete: () => {
        deleteMode = true;
        return builder;
      },
      maybeSingle: async () => {
        single = true;
        return resolve();
      },
      single: async () => {
        single = true;
        return resolve();
      },
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return builder;
  }

  return { from, tables };
}

let supabase: ReturnType<typeof fakeSupabase>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabase,
}));

const SESSION_ID = "s1";
const REQUEST_ID = "r1";
const ASSIGNMENT_ID = "a1";
const OTHER_ASSIGNMENT_ID = "a2";

describe("deleteConfirmationRecord", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_URL = "https://iqcommune.com";
    process.env.HMAC_SECRET = "test-secret-for-signing-only";
    mocks.requireCapability.mockResolvedValue({ email: "admin@iqcommune.com" });
  });

  it("deletes a live confirmation, vacates its session, and reopens its request", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        { id: ASSIGNMENT_ID, session_id: SESSION_ID, deleted_at: null, confirmation_reference: "IQC-CONF-0001" },
      ],
      sessions: [
        { id: SESSION_ID, reference: "IQC-S0001", session_request_id: REQUEST_ID, deleted_at: null, status: "Confirmed" },
      ],
      session_requests: [{ id: REQUEST_ID, status: "Matched", deleted_at: null }],
      activity_log: [],
    });

    const { deleteConfirmationRecord } = await import("./actions");
    const result = await deleteConfirmationRecord(ASSIGNMENT_ID);

    expect(result).toEqual({ ok: true });
    expect(supabase.tables.session_practitioners[0].deleted_at).toBeTruthy();
    expect(supabase.tables.sessions[0].deleted_at).toBeTruthy();
    expect(supabase.tables.sessions[0].status).toBe("Cancelled");
    expect(supabase.tables.session_requests[0].status).toBe("New");
  });

  it("leaves the session alone when another confirmation is still live", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        { id: ASSIGNMENT_ID, session_id: SESSION_ID, deleted_at: null, confirmation_reference: "IQC-CONF-0001" },
        { id: OTHER_ASSIGNMENT_ID, session_id: SESSION_ID, deleted_at: null, confirmation_reference: "IQC-CONF-0002" },
      ],
      sessions: [
        { id: SESSION_ID, reference: "IQC-S0001", session_request_id: REQUEST_ID, deleted_at: null, status: "Confirmed" },
      ],
      session_requests: [{ id: REQUEST_ID, status: "Matched", deleted_at: null }],
      activity_log: [],
    });

    const { deleteConfirmationRecord } = await import("./actions");
    await deleteConfirmationRecord(ASSIGNMENT_ID);

    expect(supabase.tables.session_practitioners[0].deleted_at).toBeTruthy();
    expect(supabase.tables.sessions[0].deleted_at).toBeFalsy();
    expect(supabase.tables.session_requests[0].status).toBe("Matched");
  });

  it("says there is nothing left to remove, on a row a cancellation already vacated", async () => {
    supabase = fakeSupabase({
      session_practitioners: [
        {
          id: ASSIGNMENT_ID,
          session_id: SESSION_ID,
          deleted_at: "2026-08-18T00:00:00.000Z",
          confirmation_reference: "IQC-CONF-0001",
        },
      ],
      sessions: [
        {
          id: SESSION_ID,
          reference: "IQC-S0001",
          session_request_id: REQUEST_ID,
          deleted_at: "2026-08-18T00:00:00.000Z",
          status: "Cancelled",
        },
      ],
      session_requests: [{ id: REQUEST_ID, status: "New", deleted_at: null }],
      activity_log: [],
    });

    const { deleteConfirmationRecord } = await import("./actions");
    const result = await deleteConfirmationRecord(ASSIGNMENT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/already/i);
    // No false "deleted" entry for a deletion that did not happen.
    expect(supabase.tables.activity_log).toHaveLength(0);
  });
});
