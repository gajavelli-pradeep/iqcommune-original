import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { GALLERY_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { GalleryRow } from "@/services/console";

/** The public "Sessions in the room" gallery — what is published on the landing page. */

const COLUMNS: ReadonlyArray<ColumnDef<GalleryRow>> = [
  { key: "sortOrder", header: "Order", align: "right", render: (row) => row.sortOrder },
  { key: "caption", header: "Caption", render: (row) => row.caption },
  { key: "city", header: "City", render: (row) => row.city },
  { key: "addedOn", header: "Added on", render: (row) => row.addedOn },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...GALLERY_STATUS[row.status]} />,
  },
];

export function GalleryPanel({ rows, role }: { rows: readonly GalleryRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Gallery"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No gallery photos yet."
    />
  );
}
