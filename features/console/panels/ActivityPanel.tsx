import { CellStack, ConsoleTable, type ColumnDef } from "../ConsoleTable";
import type { ConsoleRole } from "../roles";
import type { ActivityRow } from "@/services/console";

/** The audit trail — global-admin only, gated by the `viewActivity` capability. */

const COLUMNS: ReadonlyArray<ColumnDef<ActivityRow>> = [
  { key: "at", header: "When", render: (row) => row.at },
  { key: "actor", header: "Actor", render: (row) => row.actor },
  {
    key: "action",
    header: "Action",
    render: (row) => <CellStack value={row.action} sub={row.entity || undefined} />,
  },
  { key: "detail", header: "Detail", render: (row) => row.detail || "—" },
];

export function ActivityPanel({ rows, role }: { rows: readonly ActivityRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Activity log"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No activity recorded yet."
    />
  );
}
