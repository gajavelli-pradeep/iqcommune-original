import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { SESSION_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { SessionRow } from "@/services/console";

/** Scheduled and delivered sessions. */

const COLUMNS: ReadonlyArray<ColumnDef<SessionRow>> = [
  { key: "reference", header: "Reference", render: (row) => row.reference },
  { key: "module", header: "Module", render: (row) => row.module },
  { key: "sessionDate", header: "Date", render: (row) => row.sessionDate },
  { key: "location", header: "Location", render: (row) => row.location },
  { key: "spoc", header: "SPOC", render: (row) => row.spoc },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = SESSION_STATUS[row.status as keyof typeof SESSION_STATUS];
      return meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />;
    },
  },
];

export function SessionsPanel({ rows, role }: { rows: readonly SessionRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Session details"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No sessions yet."
    />
  );
}
