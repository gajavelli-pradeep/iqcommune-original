"use client";

import { type ColumnDef } from "../ConsoleTable";
import { FilterablePanel, type StatusOption } from "../FilterablePanel";
import { PRACTITIONER_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import { PractitionerProfile } from "./PractitionerProfile";
import type { PractitionerRow } from "@/services/console";

/**
 * The practitioner pipeline — the console's first panel and the one every other
 * follows. Five columns and nothing else: V7 has no actions column here, and
 * adding one would be inventing a control the spec does not have. Every action
 * lives in the detail card the row opens (`PractitionerProfile`), which is also
 * where the rest of the application's fields are.
 */

/** First letters of the first two words — "Priya Sharma" → "PS". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const COLUMNS: ReadonlyArray<ColumnDef<PractitionerRow>> = [
  {
    key: "practitioner",
    header: "Practitioner",
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gold-light text-sm font-semibold text-gold-dark"
        >
          {initials(row.name)}
        </span>
        <div>
          <div className="text-base font-medium text-ink">{row.name}</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {[row.role, row.organisation].filter(Boolean).join(" · ")}
            {row.averageRating !== null ? (
              <span className="text-gold-dark"> · ★ {row.averageRating} avg</span>
            ) : null}
          </div>
        </div>
      </div>
    ),
  },
  { key: "module", header: "Module", render: (row) => <span className="text-ink-muted">{row.module}</span> },
  {
    key: "city",
    header: "City",
    render: (row) => (
      <span className="text-ink-muted">
        {row.city}
        {row.state ? <span className="block text-3xs text-ink-faint">{row.state}</span> : null}
      </span>
    ),
  },
  {
    key: "appliedOn",
    header: "Applied on",
    render: (row) => <span className="text-xs text-ink-faint">{row.appliedOn}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = PRACTITIONER_STATUS[row.status as keyof typeof PRACTITIONER_STATUS];
      // An unrecognised status is shown as itself rather than hidden: a value
      // the console does not know about is a thing to notice, not to swallow.
      return meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />;
    },
  },
];

/** The pipeline stages shown as filter pills (V7 `.filter-bar`). */
const STATUSES: readonly StatusOption[] = [
  { value: "Applied", label: "Applied" },
  { value: "Screening Done", label: "Screening done" },
  { value: "Agreement Sent", label: "Agreement sent" },
  { value: "Empanelled", label: "Empanelled" },
  { value: "Rejected", label: "Rejected" },
];

/** Not yet resolved — the pending stat-card counts these. */
const RESOLVED = new Set(["Empanelled", "Rejected", "Deactivated"]);

export function PractitionersPanel({
  rows,
  role,
}: {
  rows: readonly PractitionerRow[];
  role: ConsoleRole;
}) {
  return (
    <FilterablePanel
      caption="Practitioner pipeline"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      rowLabel={(row) => row.name}
      empty="No practitioners match this filter."
      statusOf={(row) => row.status}
      statuses={STATUSES}
      isPending={(row) => !RESOLVED.has(row.status)}
      pendingLabel="Pending action (not yet Empanelled/Rejected)"
      periodOf={(row) => row.appliedOn}
      periodLabel="Applied in:"
      expand={(row) => <PractitionerProfile row={row} role={role} />}
    />
  );
}
