import { cancelSessionRequest, matchSessionRequest } from "../actions";
import { CellStack, ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { RowAction } from "../RowAction";
import { REQUEST_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { SessionRequestRow } from "@/services/console";

/** The public "Request a Session" submissions — step 1 of the operating loop. */

const COLUMNS: ReadonlyArray<ColumnDef<SessionRequestRow>> = [
  {
    key: "requester",
    header: "Requested by",
    render: (row) => <CellStack value={row.name} sub={row.organisation ?? undefined} />,
  },
  { key: "topic", header: "Topic", render: (row) => row.topic },
  { key: "audience", header: "Audience", render: (row) => row.audience },
  { key: "location", header: "Location", render: (row) => row.location },
  { key: "requestedOn", header: "Requested on", render: (row) => row.requestedOn },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = REQUEST_STATUS[row.status as keyof typeof REQUEST_STATUS];
      return meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />;
    },
  },
  {
    key: "actions",
    header: "",
    align: "right",
    requires: "mutate",
    render: (row) =>
      row.status === "New" ? (
        <div className="flex justify-end gap-1">
          <RowAction
            action={matchSessionRequest.bind(null, row.id)}
            label="Match"
            pendingMessage={`Matching ${row.name}'s request…`}
          />
          <RowAction
            action={cancelSessionRequest.bind(null, row.id)}
            label="Cancel"
            pendingMessage="Cancelling request…"
            tone="danger"
          />
        </div>
      ) : null,
  },
];

export function RequestsPanel({
  rows,
  role,
}: {
  rows: readonly SessionRequestRow[];
  role: ConsoleRole;
}) {
  return (
    <ConsoleTable
      caption="Session requests"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No session requests yet."
    />
  );
}
