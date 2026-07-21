import { CellStack, ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { PRACTITIONER_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { PractitionerRow } from "@/services/console";

/**
 * The practitioner pipeline — the console's first panel and the one every other
 * follows. It is a column list and nothing else; the table, the pill and the
 * role gating are shared.
 */

const COLUMNS: ReadonlyArray<ColumnDef<PractitionerRow>> = [
  {
    key: "practitioner",
    header: "Practitioner",
    render: (row) => (
      <CellStack
        value={row.name}
        sub={[row.role, row.organisation].filter(Boolean).join(" · ")}
      />
    ),
  },
  { key: "module", header: "Module", render: (row) => row.module },
  { key: "city", header: "City", render: (row) => row.city },
  { key: "appliedOn", header: "Applied on", render: (row) => row.appliedOn },
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

export function PractitionersPanel({
  rows,
  role,
}: {
  rows: readonly PractitionerRow[];
  role: ConsoleRole;
}) {
  return (
    <ConsoleTable
      caption="Practitioner pipeline"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No practitioners yet."
    />
  );
}
