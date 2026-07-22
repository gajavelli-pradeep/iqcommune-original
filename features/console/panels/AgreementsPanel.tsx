import { sendAgreement } from "../actions";
import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { RowAction } from "../RowAction";
import { AGREEMENT_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { AgreementRow } from "@/services/console";

/** Empanelment agreements and whether each has been signed. */

const COLUMNS: ReadonlyArray<ColumnDef<AgreementRow>> = [
  { key: "reference", header: "Reference", render: (row) => row.reference },
  { key: "practitioner", header: "Practitioner", render: (row) => row.practitioner },
  { key: "modules", header: "Modules", render: (row) => row.modules },
  { key: "version", header: "Version", render: (row) => row.version },
  { key: "issuedOn", header: "Issued on", render: (row) => row.issuedOn },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...AGREEMENT_STATUS[row.status]} />,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    requires: "mutate",
    render: (row) =>
      row.status === "Pending" ? (
        <RowAction
          action={sendAgreement.bind(null, row.id)}
          label="Send link"
          pendingMessage={`Sending the agreement to ${row.practitioner}…`}
        />
      ) : null,
  },
];

export function AgreementsPanel({
  rows,
  role,
}: {
  rows: readonly AgreementRow[];
  role: ConsoleRole;
}) {
  return (
    <ConsoleTable
      caption="Practitioner agreements"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No agreements yet."
    />
  );
}
