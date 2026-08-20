"use client";

import { type ColumnDef } from "../ConsoleTable";
import { FilterablePanel, type CsvColumn } from "../FilterablePanel";
import { REQUEST_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import { RequestDetail } from "./RequestDetail";
import type { AssignablePractitioner, SessionRequestRow } from "@/services/console";

/**
 * The public "Request a Session" submissions — step 1 of the operating loop.
 *
 * Ten columns, as V7 has them: this is a triage table, and the point of it is
 * that an admin can judge a request without opening it. Everything that acts on
 * a request lives in the card it opens.
 */

const COLUMNS: ReadonlyArray<ColumnDef<SessionRequestRow>> = [
  {
    key: "requester",
    header: "SPOC / Requester",
    render: (row) => (
      <div>
        <div className="font-medium text-ink">{row.name}</div>
        <div className="mt-0.5 text-sm text-ink-muted">{row.organisation ?? "—"}</div>
        {/* Whether a venue exists decides whether this request can be scheduled
            at all, so it is surfaced here rather than buried in the card. */}
        {row.venue ? (
          <div className="mt-0.5 text-3xs text-green">📍 Venue provided</div>
        ) : (
          <div className="mt-0.5 text-3xs text-gold-dark">⚠ Venue pending</div>
        )}
      </div>
    ),
  },
  { key: "topic", header: "Topic", render: (row) => <span className="text-ink-muted">{row.topic}</span> },
  {
    key: "audience",
    header: "Audience type",
    render: (row) => <span className="text-xs text-ink-muted">{row.audience}</span>,
  },
  {
    key: "city",
    header: "City",
    render: (row) => (
      <span className="text-xs text-ink-muted">
        {row.city || "—"}
        {row.state ? <span className="block text-3xs text-ink-faint">{row.state}</span> : null}
      </span>
    ),
  },
  {
    key: "groupSize",
    header: "Group size",
    render: (row) => (
      <span className="text-ink-muted">{row.groupSize ? `${row.groupSize} people` : "—"}</span>
    ),
  },
  {
    key: "minCommitment",
    header: "Min. commitment",
    render: (row) =>
      row.minCommitment ? (
        <span className="font-semibold text-gold-dark">{row.minCommitment} pax</span>
      ) : (
        <span className="text-xs text-ink-faint">—</span>
      ),
  },
  {
    key: "preferredDates",
    header: "Preferred dates",
    render: (row) => <span className="text-xs text-ink-muted">{row.preferredDates ?? "—"}</span>,
  },
  {
    key: "received",
    header: "Received",
    render: (row) => <span className="text-xs text-ink-faint">{row.receivedOn}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = REQUEST_STATUS[row.status as keyof typeof REQUEST_STATUS];
      return meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />;
    },
  },
  {
    key: "assignedTo",
    header: "Assigned to",
    render: (row) =>
      row.assignedTo ? (
        <div>
          <span className="text-xs text-ink-muted">{row.assignedTo}</span>
          <div className="text-3xs text-ink-faint">→ Session {row.sessionReference ?? "—"}</div>
        </div>
      ) : (
        <span className="text-2xs text-ink-faint">Unassigned</span>
      ),
  },
];

/** Plain-text columns for the header's CSV export — independent of `COLUMNS`,
 *  whose `render` returns JSX (status pills, the assignment sub-line) with no
 *  plain-text form. Includes email, phone, venue and notes: not on screen,
 *  but exactly what a follow-up call needs and the table has no room for. */
const CSV_COLUMNS: ReadonlyArray<CsvColumn<SessionRequestRow>> = [
  { header: "Requester", value: (row) => row.name },
  { header: "Organisation", value: (row) => row.organisation ?? "" },
  { header: "Email", value: (row) => row.email },
  { header: "Phone", value: (row) => row.phone },
  { header: "Topic", value: (row) => row.topic },
  { header: "Audience type", value: (row) => row.audience },
  { header: "City", value: (row) => row.city },
  { header: "State", value: (row) => row.state ?? "" },
  { header: "Group size", value: (row) => row.groupSize ?? "" },
  { header: "Min. commitment", value: (row) => (row.minCommitment ? String(row.minCommitment) : "") },
  { header: "Preferred dates", value: (row) => row.preferredDates ?? "" },
  { header: "Venue", value: (row) => row.venue ?? "" },
  { header: "Notes", value: (row) => row.notes ?? "" },
  { header: "Received", value: (row) => row.receivedOn },
  { header: "Status", value: (row) => row.status },
  { header: "Assigned to", value: (row) => row.assignedTo ?? "" },
  { header: "Session reference", value: (row) => row.sessionReference ?? "" },
];

export function RequestsPanel({
  rows,
  role,
  practitioners,
}: {
  rows: readonly SessionRequestRow[];
  role: ConsoleRole;
  practitioners: readonly AssignablePractitioner[];
}) {
  return (
    <FilterablePanel
      caption="Session requests"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      rowLabel={(row) => `the request from ${row.name}`}
      empty="No session requests yet."
      statusOf={(row) => row.status}
      isPending={(row) => row.status === "New"}
      pendingLabel="New — unassigned"
      periodOf={(row) => row.receivedOn}
      periodLabel="Received in:"
      expand={(row) => <RequestDetail row={row} role={role} practitioners={practitioners} />}
      csvFilename="session-requests.csv"
      csvColumns={CSV_COLUMNS}
    />
  );
}
