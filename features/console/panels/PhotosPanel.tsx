"use client";

import { useState } from "react";

import { deletePhotoSubmission } from "../actions";
import { ConsoleTable, PersonCell, type ColumnDef } from "../ConsoleTable";
import { DownloadIcon } from "../DownloadLink";
import { PeriodFilter, matchesPeriod, yearsIn } from "../PeriodFilter";
import { RowAction } from "../RowAction";
import { can, type ConsoleRole } from "../roles";
import { DownloadPhotosModal, UploadPhotosModal } from "./PhotoModals";
import type { PhotoRow } from "@/services/console";

/**
 * Session Photos.
 *
 * A row is a completed session, not a submission — "every completed session
 * appears here", with photos either landed or still pending. Listing
 * submissions would hide precisely the rows worth chasing.
 *
 * It also lists any submission that arrived outside that flow, which the
 * completed-only rule used to swallow whole: photos sent the evening of a
 * session still sitting at Confirmed, or sent through the public form with no
 * session named. Those rows say which, since an unexplained extra row is its
 * own confusion.
 *
 * Retention is the other half: photos expire 30 days after upload, so the tab
 * shows how long is left and warns before it runs out. That countdown is the
 * only warning anyone gets — which is exactly why a submission must never be
 * missing from this table.
 */

/** V7 `.btn-ghost.btn-xs` — the shared look of both cell triggers. */
const GHOST_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Expiry urgency, matching V7's thresholds. */
function urgency(days: number) {
  if (days <= 5) return { text: "text-red", bar: "bg-red" };
  if (days <= 10) return { text: "text-gold-dark", bar: "bg-gold" };
  return { text: "text-green", bar: "bg-green" };
}

/** V7's days-left cell: a figure and a 30-day depletion bar. */
function DaysLeft({ days }: { days: number }) {
  const tone = urgency(days);
  const percent = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));

  return (
    <div>
      <span className={`text-xs font-medium ${days > 0 ? tone.text : "text-red"}`}>
        {days > 0 ? `${days}d` : "Expired"}
      </span>
      <div
        role="img"
        aria-label={days > 0 ? `${days} days until these photos expire` : "These photos have expired"}
        className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-surface-soft"
      >
        <div className={`h-full ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * The admin-side upload (V7's Upload button), for photos a practitioner sent
 * some other way. Disabled once a session has photos — V7 says "delete to
 * reupload", and appending a second set silently would make the count a lie.
 */
function UploadPhotos({ row }: { row: PhotoRow }) {
  const [open, setOpen] = useState(false);

  if (row.submissionId) {
    return (
      <span className="text-2xs text-ink-faint" title="Delete the existing photos to re-upload">
        Uploaded
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Upload photos for ${row.sessionReference}`}
        className={GHOST_BUTTON}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload
      </button>
      <UploadPhotosModal row={row} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Download opens V7's photo dialog: a grid of the session's photos to choose
 * from. The bucket is private — these are identifiable participants who
 * consented to a specific use — so the grid is built from short-lived signed
 * URLs fetched when it opens, never from a permanent link.
 */
function DownloadPhotos({ row }: { row: PhotoRow }) {
  const [open, setOpen] = useState(false);

  if (!row.submissionId) return <span className="text-2xs text-ink-faint">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Download ${row.photoCount} photo(s) for ${row.sessionReference}`}
        className={GHOST_BUTTON}
      >
        <DownloadIcon />
        Download
      </button>
      <DownloadPhotosModal row={row} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function columns(role: ConsoleRole): ReadonlyArray<ColumnDef<PhotoRow>> {
  const mayEdit = can(role, "mutate");

  return [
    {
      key: "practitioner",
      header: "Practitioner",
      render: (row) => (
        <PersonCell
          name={row.practitioner}
          sub={
            row.practitionerReference ? (
              <span className="font-mono text-3xs">{row.practitionerReference}</span>
            ) : undefined
          }
        />
      ),
    },
    {
      key: "sessionReference",
      header: "Session ref.",
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-ink-muted">{row.sessionReference}</span>
          {/* Why a row is here at all, when it is not a completed session.
              Without it these photos read as an unexplained extra row, and the
              admin has no hint that the session still needs marking. */}
          {row.submissionId && row.sessionStatus !== "Completed" ? (
            <span
              className="mt-0.5 block text-3xs text-gold-dark"
              title={
                row.sessionStatus
                  ? `These photos arrived before the session was marked Completed. It is currently ${row.sessionStatus}.`
                  : "These photos were sent through the public form on the website, so they name no session."
              }
            >
              {row.sessionStatus ? `Session ${row.sessionStatus}` : "No session linked"}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: "module", header: "Module", render: (row) => <span className="text-xs text-ink-muted">{row.module}</span> },
    { key: "city", header: "City", render: (row) => <span className="text-xs text-ink-muted">{row.city}</span> },
    {
      key: "upload",
      header: "Upload Photos",
      requires: "mutate",
      render: (row) => <UploadPhotos row={row} />,
    },
    {
      key: "uploadedOn",
      header: "Uploaded date",
      render: (row) => <span className="text-xs text-ink-muted">{row.uploadedOn ?? "—"}</span>,
    },
    {
      key: "download",
      header: "Download Photos",
      render: (row) => <DownloadPhotos row={row} />,
    },
    {
      key: "expiresOn",
      header: "Expires on",
      render: (row) => <span className="text-xs text-ink-muted">{row.expiresOn ?? "—"}</span>,
    },
    {
      key: "daysLeft",
      header: "Days left",
      render: (row) =>
        row.daysLeft === null ? <span className="text-xs text-ink-faint">—</span> : <DaysLeft days={row.daysLeft} />,
    },
    {
      key: "actions",
      header: "Actions",
      requires: "mutate",
      render: (row) =>
        row.submissionId && mayEdit ? (
          <RowAction
            action={deletePhotoSubmission.bind(null, row.submissionId)}
            label="Delete"
            pendingMessage={`Deleting the photos for ${row.sessionReference}…`}
            variant="ghost"
            tone="danger"
          />
        ) : (
          <span className="text-2xs text-ink-faint">—</span>
        ),
    },
  ];
}

export function PhotosPanel({ rows, role }: { rows: readonly PhotoRow[]; role: ConsoleRole }) {
  const [filter, setFilter] = useState<"all" | "pending" | "expiring">("all");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const pending = rows.filter((row) => row.submissionId === null).length;
  const expiring = rows.filter((row) => row.daysLeft !== null && row.daysLeft <= 7).length;

  const shown = rows.filter((row) => {
    if (!matchesPeriod(row.sessionDate, month, year)) return false;
    if (filter === "pending") return row.submissionId === null;
    if (filter === "expiring") return row.daysLeft !== null && row.daysLeft <= 7;
    return true;
  });

  const card = (active: boolean) =>
    `min-w-[120px] rounded-lg border bg-red-light px-4 py-2 text-left transition-[box-shadow,border-color] ${
      active ? "border-red shadow-[0_0_0_2px_rgba(192,57,43,0.18)]" : "border-red/30 hover:border-red"
    }`;

  return (
    <>
      {/* V7 .pending-bar — this is the one tab with TWO cards, because "no
          photos yet" and "photos about to expire" are different queues that
          need chasing differently. Selecting one clears the other. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={filter === "pending"}
            onClick={() => setFilter((current) => (current === "pending" ? "all" : "pending"))}
            className={card(filter === "pending")}
          >
            <span className="block text-4xl font-bold leading-[1.1] text-red">{pending}</span>
            <span className="block text-xs text-ink-muted">Not yet uploaded</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === "expiring"}
            onClick={() => setFilter((current) => (current === "expiring" ? "all" : "expiring"))}
            className={card(filter === "expiring")}
          >
            <span className="block text-4xl font-bold leading-[1.1] text-red">{expiring}</span>
            <span className="block text-xs text-ink-muted">Expiring within 7 days</span>
          </button>
        </div>

        <PeriodFilter
          label="Session date:"
          month={month}
          year={year}
          years={yearsIn(rows.map((row) => row.sessionDate))}
          onMonth={setMonth}
          onYear={setYear}
          idPrefix="photos-period"
        />
      </div>

      <ConsoleTable
        caption="Session photos"
        columns={columns(role)}
        rows={shown}
        role={role}
        rowKey={(row) => row.id}
        empty="No completed sessions yet. Once a session is marked Completed it appears here — either with photos uploaded, or pending from the practitioner."
      />
    </>
  );
}
