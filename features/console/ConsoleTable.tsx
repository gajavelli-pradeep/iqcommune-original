import type { ReactNode } from "react";

import { can, type Capability, type ConsoleRole } from "./roles";

/**
 * One table for the whole console.
 *
 * Every panel in the spec is the same structure — a header row, mapped rows, a
 * status pill, and actions gated by role — differing only in columns and data.
 * Nine table components would be the 1,596-line-page mistake again at a smaller
 * scale; nine `ColumnDef[]` arrays are the same work done once.
 *
 * Role gating lives here rather than in each column: a column that declares a
 * capability is *not rendered* for a role that lacks it, header included, so a
 * User never receives an action cell to reason about. The mockup hides those
 * cells with CSS, which leaves them in the DOM and focusable.
 */

export interface ColumnDef<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Only where the spec sets one explicitly. */
  width?: string;
  /** Omit for a column every role may see. */
  requires?: Capability;
  render: (row: Row) => ReactNode;
}

export function ConsoleTable<Row>({
  columns,
  rows,
  role,
  rowKey,
  empty = "Nothing here yet.",
  caption,
}: {
  columns: ReadonlyArray<ColumnDef<Row>>;
  rows: readonly Row[];
  role: ConsoleRole;
  rowKey: (row: Row) => string;
  empty?: string;
  /** Describes the table for screen readers; visually hidden. */
  caption: string;
}) {
  const visible = columns.filter((column) => !column.requires || can(role, column.requires));

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-6 py-8 text-center text-base text-ink-muted">
        {empty}
      </p>
    );
  }

  return (
    // Tables are the one place horizontal scroll is correct rather than a bug:
    // a ten-column console table cannot reflow to 320px without losing columns.
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {visible.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={`px-4 py-3 text-2xs font-semibold uppercase tracking-caps text-ink-faint ${
                  column.align === "right" ? "text-right" : ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-b-0">
              {visible.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 align-top text-base text-ink ${
                    column.align === "right" ? "text-right tabular-nums" : ""
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A value with a smaller line beneath it — the console's commonest cell. */
export function CellStack({ value, sub }: { value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="font-medium text-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-sm text-ink-muted">{sub}</div> : null}
    </div>
  );
}
