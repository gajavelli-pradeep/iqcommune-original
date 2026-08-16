"use client";

import { clearSignedAgreement, sendWelcomeMessage } from "../actions";
import { PersonCell, type ColumnDef } from "../ConsoleTable";
import { DownloadLink } from "../DownloadLink";
import { FilterablePanel } from "../FilterablePanel";
import { RowAction } from "../RowAction";
import { AGREEMENT_STATUS, StatusPill } from "../StatusPill";
import type { ConsoleRole } from "../roles";
import type { AgreementRow } from "@/services/console";

/**
 * Empanelment agreements.
 *
 * Practitioners arrive here automatically once their agreement is issued, and
 * every column but the reference fills itself in the moment they sign online —
 * which is why this panel has no "mark as signed" control. The one write it
 * offers undoes a signature captured in error.
 */

const COLUMNS: ReadonlyArray<ColumnDef<AgreementRow>> = [
  {
    key: "practitioner",
    header: "Practitioner",
    render: (row) => <PersonCell name={row.practitioner} />,
  },
  {
    key: "reference",
    header: "Agreement ref.",
    // Monospace so two references differing by one digit are told apart at a
    // glance — V7 sets the same.
    render: (row) => <span className="font-mono text-xs text-ink-muted">{row.reference}</span>,
  },
  {
    key: "signedOn",
    header: "Signed on",
    render: (row) =>
      row.signedOn ? (
        <span className="text-xs text-ink-muted">{row.signedOn}</span>
      ) : (
        // Not blank: nothing is missing, it has not happened yet.
        <span className="text-xs text-ink-faint">— awaiting signature —</span>
      ),
  },
  {
    key: "method",
    header: "Method",
    render: (row) => <span className="text-xs text-ink-muted">{row.method ?? "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...AGREEMENT_STATUS[row.status]} />,
  },
  {
    key: "download",
    header: "Download Signed Agreement",
    render: (row) => (
      <DownloadLink
        href={`/api/agreements/${row.id}/pdf`}
        label="Download"
        title={
          row.status === "Signed"
            ? `Download ${row.practitioner}'s signed agreement`
            : `Download the unsigned agreement issued to ${row.practitioner}`
        }
      />
    ),
  },
  /**
   * V7's seventh column, between the download and the actions.
   *
   * The welcome used to be offered only from the practitioner profile, under
   * Automated actions — two clicks from the list of people who had just signed,
   * and nothing on this table said whether it had gone. Here the answer is the
   * control: a pill once sent, the send itself until then.
   *
   * Offered only against a signed agreement, as V7 has it: an em dash while
   * unsigned, then the send. The message tells someone they are officially
   * empanelled, and Pending means they have not signed.
   */
  {
    key: "welcome",
    header: "Welcome Message",
    requires: "mutate",
    render: (row) =>
      row.welcomeSentAt ? (
        <StatusPill label="Sent" tone="success" />
      ) : row.status === "Signed" ? (
        <RowAction
          action={sendWelcomeMessage.bind(null, `prac:${row.practitionerId}`)}
          draft={{ kind: "practitioner-welcome", id: `prac:${row.practitionerId}` }}
          label="Send welcome message"
          pendingMessage={`Sending a welcome to ${row.practitioner}…`}
          variant="red-pill"
        />
      ) : (
        <span className="text-xs text-ink-faint">—</span>
      ),
  },
  {
    key: "actions",
    header: "Actions",
    requires: "mutate",
    render: (row) =>
      row.status === "Signed" ? (
        <RowAction
          action={clearSignedAgreement.bind(null, row.id)}
          label="Delete"
          pendingMessage={`Clearing ${row.practitioner}’s signed agreement — they return to “Agreement sent”…`}
          variant="ghost"
          tone="danger"
        />
      ) : (
        // Nothing to clear on an unsigned agreement, and offering a Delete that
        // silently does nothing is worse than not offering it.
        <span className="text-xs text-ink-faint">—</span>
      ),
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
    <FilterablePanel
      caption="Practitioner agreements"
      columns={COLUMNS}
      rows={rows}
      role={role}
      rowKey={(row) => row.id}
      empty="No agreements yet."
      statusOf={(row) => row.status}
      isPending={(row) => row.status !== "Signed"}
      pendingLabel="Signed copy not yet uploaded"
      periodOf={(row) => row.signedOn ?? ""}
      periodLabel="Signed in:"
    />
  );
}
