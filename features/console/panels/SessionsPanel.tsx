"use client";

import { useState, useTransition } from "react";

import { selectClass } from "@/components/ui/control";

import { recordRatingManually, sendRatingRequest, setSessionStatus } from "../actions";
import { PersonCell, type ColumnDef } from "../ConsoleTable";
import { FilterablePanel } from "../FilterablePanel";
import { RowAction } from "../RowAction";
import { can, type ConsoleRole } from "../roles";
import type { SessionRow } from "@/services/console";

/**
 * Session Details — the delivery dashboard.
 *
 * The status control is a select rather than a pill because this is where a
 * session is marked delivered, and that mark is what opens everything after it:
 * the rating link becomes sendable and the payout becomes due. Nothing else in
 * the console can set it.
 */

const SELECT = selectClass({ tone: "inline", className: "min-w-[118px]" });

/** The five stars, filled to `value`. Read-only — V7 renders them as output. */
function Stars({ value, title }: { value: number; title?: string }) {
  return (
    <div className="flex gap-0.5" title={title}>
      <span className="sr-only">{value} out of 5</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden
          className={`text-[15px] ${star <= value ? "text-gold" : "text-border-strong"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/** V7's "Got it verbally?" disclosure — Global Admin only (`role-override`). */
function ManualRating({ assignmentId }: { assignmentId: string }) {
  const [rating, setRating] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-3xs text-ink-faint">Got it verbally?</summary>
      <div className="mt-1 flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`${assignmentId}-rating`}>
          Rating out of 5
        </label>
        <select
          id={`${assignmentId}-rating`}
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          className="rounded-md border border-border-strong bg-surface px-1.5 py-1 text-xs text-ink"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await recordRatingManually(assignmentId, Number(rating));
              setError(result.ok ? null : result.message);
            })
          }
          className="rounded-full border border-border-strong bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
        >
          {pending ? "Saving…" : "Record"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-3xs text-red">
          {error}
        </p>
      ) : null}
    </details>
  );
}

/** The status select, kept out of the column list so it can hold its own state. */
function StatusSelect({ row }: { row: SessionRow }) {
  const [status, setStatus] = useState(row.status);
  const [pending, start] = useTransition();

  return (
    <>
      <label className="sr-only" htmlFor={`${row.id}-status`}>
        Status for session {row.reference}
      </label>
      <select
        id={`${row.id}-status`}
        value={status === "Confirmed" || status === "Completed" ? status : "Confirmed"}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setStatus(next);
          start(async () => {
            await setSessionStatus(row.id, next);
          });
        }}
        className={SELECT}
      >
        <option value="Confirmed">Confirmed</option>
        <option value="Completed">Completed</option>
      </select>
    </>
  );
}

function columns(role: ConsoleRole): ReadonlyArray<ColumnDef<SessionRow>> {
  const mayOverride = can(role, "override");

  return [
    {
      key: "session",
      header: "Session",
      render: (row) => (
        <div>
          <div className="font-medium text-ink">{row.module}</div>
          <div className="mt-0.5 text-sm text-ink-muted">{row.reference}</div>
        </div>
      ),
    },
    {
      key: "requester",
      header: "Requestor (SPOC)",
      render: (row) => (
        <span className="text-xs text-ink-muted">
          {row.requester}
          {row.requesterOrganisation ? (
            <span className="block text-3xs text-ink-faint">{row.requesterOrganisation}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "practitioner",
      header: "Practitioner",
      render: (row) => <PersonCell name={row.practitioner} />,
    },
    { key: "date", header: "Date", render: (row) => <span className="text-sm text-ink">{row.sessionDate}</span> },
    {
      key: "audience",
      header: "Audience",
      render: (row) => <span className="text-xs text-ink-muted">{row.audience}</span>,
    },
    {
      key: "participants",
      header: "Participants",
      render: (row) => <span className="font-medium text-ink">{row.participants ?? "—"}</span>,
    },
    {
      key: "grossPayout",
      header: "Gross Payout (₹)",
      render: (row) =>
        row.grossPayout ? (
          <span className="font-medium text-ink">{row.grossPayout}</span>
        ) : (
          <span className="text-2xs text-ink-faint">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      requires: "mutate",
      render: (row) => <StatusSelect key={row.id} row={row} />,
    },
    {
      key: "seekFeedback",
      header: "Seek Feedback",
      requires: "mutate",
      render: (row) =>
        // Only once delivered: asking the requestor to rate a session that has
        // not happened is the kind of email that loses a client.
        row.status === "Completed" && row.assignmentId ? (
          <RowAction
            action={sendRatingRequest.bind(null, row.assignmentId)}
            draft={{ kind: "rating-request", id: row.assignmentId }}
            label="Send email"
            pendingMessage={`Sending a rating request for ${row.reference}…`}
            variant="ghost"
          />
        ) : (
          <span className="text-2xs text-ink-faint">—</span>
        ),
    },
    {
      key: "rating",
      header: "Practitioner Rating",
      render: (row) => {
        if (row.status !== "Completed") return <span className="text-2xs text-ink-faint">—</span>;
        if (row.rating !== null) {
          return (
            <div>
              <Stars
                value={row.rating}
                title={
                  row.ratingRecordedBy
                    ? `Recorded by ${row.ratingRecordedBy} from a verbal report`
                    : "Submitted by the requestor"
                }
              />
              {row.ratingRecordedBy ? (
                <div className="mt-0.5 text-3xs text-ink-faint">Recorded verbally</div>
              ) : null}
            </div>
          );
        }
        return (
          <div>
            <Stars value={0} />
            {mayOverride && row.assignmentId ? (
              <ManualRating key={row.assignmentId} assignmentId={row.assignmentId} />
            ) : null}
          </div>
        );
      },
    },
  ];
}

export function SessionsPanel({ rows, role }: { rows: readonly SessionRow[]; role: ConsoleRole }) {
  return (
    <FilterablePanel
      caption="Session details"
      columns={columns(role)}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No confirmed sessions yet."
      statusOf={(row) => row.status}
      isPending={(row) => row.status !== "Completed"}
      pendingLabel="Confirmed, not yet Completed"
      periodOf={(row) => row.sessionDate}
      periodLabel="Session date:"
    />
  );
}
