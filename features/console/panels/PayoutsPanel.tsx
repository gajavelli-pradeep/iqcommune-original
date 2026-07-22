import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { PAYOUT_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { PayoutRow } from "@/services/console";

/**
 * Gross payouts per session assignment. Pre-tax by design (ADR-0001) — TDS/GST/
 * net are administered offline by finance; this view is the confirmed gross only.
 */

const COLUMNS: ReadonlyArray<ColumnDef<PayoutRow>> = [
  { key: "reference", header: "Reference", render: (row) => row.reference },
  { key: "practitioner", header: "Practitioner", render: (row) => row.practitioner },
  { key: "session", header: "Session", render: (row) => row.session },
  { key: "grossPayout", header: "Gross payout", align: "right", render: (row) => row.grossPayout },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...PAYOUT_STATUS[row.status]} />,
  },
];

export function PayoutsPanel({ rows, role }: { rows: readonly PayoutRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Payouts"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No payouts yet."
    />
  );
}
