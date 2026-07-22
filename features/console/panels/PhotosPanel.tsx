import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { PHOTO_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { PhotoRow } from "@/services/console";

/** Post-session photo submissions awaiting review. */

const COLUMNS: ReadonlyArray<ColumnDef<PhotoRow>> = [
  { key: "submitter", header: "Submitter", render: (row) => row.submitter },
  { key: "module", header: "Module", render: (row) => row.module },
  { key: "sessionDate", header: "Session date", render: (row) => row.sessionDate },
  { key: "photoCount", header: "Photos", align: "right", render: (row) => row.photoCount },
  { key: "submittedOn", header: "Submitted on", render: (row) => row.submittedOn },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = PHOTO_STATUS[row.status as keyof typeof PHOTO_STATUS];
      return meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />;
    },
  },
];

export function PhotosPanel({ rows, role }: { rows: readonly PhotoRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Photo submissions"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No photo submissions yet."
    />
  );
}
