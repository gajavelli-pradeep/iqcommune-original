import { sendConsentRequest, sendPhotoGuide, sendRatingRequest } from "../actions";
import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { RowAction } from "../RowAction";
import { CONSENT_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { ConsentRow } from "@/services/console";

/** Per-practitioner-per-session consent to the confirmed payout. */

const COLUMNS: ReadonlyArray<ColumnDef<ConsentRow>> = [
  { key: "practitioner", header: "Practitioner", render: (row) => row.practitioner },
  { key: "session", header: "Session", render: (row) => row.session },
  { key: "grossPayout", header: "Gross payout", align: "right", render: (row) => row.grossPayout },
  { key: "recordedOn", header: "Recorded on", render: (row) => row.recordedOn },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...CONSENT_STATUS[row.status]} />,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    requires: "mutate",
    render: (row) => (
      <div className="flex justify-end gap-1">
        {row.status === "Pending" ? (
          <RowAction
            action={sendConsentRequest.bind(null, row.id)}
            label="Request consent"
            pendingMessage={`Sending a consent request to ${row.practitioner}…`}
          />
        ) : null}
        <RowAction
          action={sendPhotoGuide.bind(null, row.id)}
          label="Photo guide"
          pendingMessage={`Sending the photo guide to ${row.practitioner}…`}
        />
        <RowAction
          action={sendRatingRequest.bind(null, row.id)}
          label="Rating"
          pendingMessage={`Sending a rating request to ${row.practitioner}…`}
        />
      </div>
    ),
  },
];

export function ConsentPanel({ rows, role }: { rows: readonly ConsentRow[]; role: ConsoleRole }) {
  return (
    <ConsoleTable
      caption="Session consent"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No consent records yet."
    />
  );
}
