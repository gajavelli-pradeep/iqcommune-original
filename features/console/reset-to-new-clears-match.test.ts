import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A request set back to New must read as genuinely unmatched (client,
 * 2026-08-18) — not still carrying the practitioner and payout from a match
 * it no longer has a live session behind. `resetSessionForRematch`'s own
 * clearing is pinned in `session-cancellation-delete.test.ts`; this covers
 * the other path back to New — an admin picking it directly from the Session
 * Requests tab's own status select (`setSessionRequestStatus`) — since the
 * same gap exists wherever a request can arrive at New.
 */

const mocks = vi.hoisted(() => ({ requireCapability: vi.fn() }));

vi.mock("./requireRole", () => ({
  requireCapability: mocks.requireCapability,
  getConsoleSession: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Row = Record<string, unknown>;

function fakeSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
  );

  function from(table: string) {
    tables[table] ??= [];
    const filters: Array<(row: Row) => boolean> = [];
    let updatePatch: Row | null = null;

    const matching = () => tables[table].filter((row) => filters.every((test) => test(row)));

    function resolve() {
      const rows = matching();
      if (updatePatch) for (const row of rows) Object.assign(row, updatePatch);
      return { data: rows, error: null };
    }

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      is: (col: string, val: null) => {
        filters.push((row) => (row[col] ?? null) === val);
        return builder;
      },
      update: (patch: Row) => {
        updatePatch = patch;
        return builder;
      },
      insert: (row: Row) => {
        tables[table].push({ ...row });
        return builder;
      },
      delete: () => ({ lt: () => Promise.resolve({ data: null, error: null }) }),
      maybeSingle: async () => resolve(),
      single: async () => resolve(),
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

const REQUEST_ID = "r1";

describe("setSessionRequestStatus, back to New", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://iqcommune.com";
    process.env.HMAC_SECRET = "test-secret-for-signing-only";
    mocks.requireCapability.mockResolvedValue({ email: "admin@iqcommune.com" });
  });

  it("clears the assigned practitioner and agreed payout, same as a cancellation-driven reset", async () => {
    supabase = fakeSupabase({
      session_requests: [
        {
          id: REQUEST_ID,
          status: "Matched",
          deleted_at: null,
          assigned_practitioner_id: "prac-1",
          agreed_gross_payout: 8500,
        },
      ],
      activity_log: [],
    });

    const { setSessionRequestStatus } = await import("./actions");
    const result = await setSessionRequestStatus(REQUEST_ID, "New");

    expect(result).toEqual({ ok: true });
    expect(supabase.tables.session_requests[0].status).toBe("New");
    expect(supabase.tables.session_requests[0].assigned_practitioner_id).toBeNull();
    expect(supabase.tables.session_requests[0].agreed_gross_payout).toBeNull();
  });
});
