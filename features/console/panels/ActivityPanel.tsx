"use client";

import { useState, useTransition } from "react";

import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { Pagination } from "../Pagination";
import type { ConsoleRole } from "../roles";
import type { ActivityPage, ActivityRow } from "@/services/console";

/**
 * The audit trail — Global Admin only, gated by the `viewActivity` capability.
 *
 * Four columns, as V7 has them: when, who, what role they hold, and what they
 * did in one sentence. The role is resolved at read time rather than stored, so
 * an entry says the role the person holds now — which is the question someone
 * reading an audit trail is actually asking.
 *
 * Paged against the database, not sliced from a capped fetch. Ninety days of
 * every action every admin takes runs to thousands of rows, and a pager over a
 * truncated list would show a total that is not the total.
 */

const COLUMNS: ReadonlyArray<ColumnDef<ActivityRow>> = [
  {
    key: "at",
    header: "Timestamp",
    render: (row) => <span className="text-xs text-ink-faint">{row.at}</span>,
  },
  { key: "user", header: "User", render: (row) => <span className="font-medium text-ink">{row.user}</span> },
  { key: "role", header: "Role", render: (row) => <span className="text-xs text-ink-muted">{row.role}</span> },
  { key: "action", header: "Action", render: (row) => <span className="text-sm text-ink-muted">{row.action}</span> },
];

export function ActivityPanel({
  initial,
  role,
  retentionDays,
}: {
  initial: ActivityPage;
  role: ConsoleRole;
  retentionDays: number;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const goTo = (page: number) =>
    start(async () => {
      setError(null);
      const response = await fetch(`/api/activity?page=${page}`);
      if (!response.ok) {
        setError("That page could not be loaded.");
        return;
      }
      setState(await response.json());
    });

  return (
    <>
      {/* The retention note is a promise, so `recordActivity` prunes on write
          to keep it true rather than leaving it as decoration. */}
      <p className="mb-4 rounded-lg bg-surface-soft px-3.5 py-2.5 text-xs text-ink-faint">
        Entries are kept for {retentionDays} days on a rolling basis — once a new entry pushes the log
        past {retentionDays} days old, the oldest entry is automatically removed to make room for it.
      </p>

      <ConsoleTable
        caption="Activity log"
        columns={COLUMNS}
        rows={state.rows}
        role={role}
        rowKey={(row) => row.id}
        empty="No activity recorded yet."
      />

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
          {error}
        </p>
      ) : null}

      <Pagination
        label="Activity log"
        page={state.page}
        pageSize={state.pageSize}
        total={state.total}
        busy={pending}
        onPage={goTo}
      />
    </>
  );
}
