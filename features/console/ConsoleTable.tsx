import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";

import { FocusableRows } from "./FocusableRows";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

import { ExpandableRows } from "./ExpandableRows";
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
  expand,
  rowLabel,
}: {
  columns: ReadonlyArray<ColumnDef<Row>>;
  rows: readonly Row[];
  role: ConsoleRole;
  rowKey: (row: Row) => string;
  empty?: string;
  /** Describes the table for screen readers; visually hidden. */
  caption: string;
  /** Returns the detail card a row opens. Omit for a table with no expansion. */
  expand?: (row: Row) => ReactNode;
  /** Names a row for the expand control's screen-reader text. */
  rowLabel?: (row: Row) => string;
}) {
  const visible = columns.filter((column) => !column.requires || can(role, column.requires));

  if (rows.length === 0) {
    return <EmptyState title={empty} />;
  }

  const cellClass = (column: ColumnDef<Row>) =>
    `px-4 py-3 align-top text-base text-ink ${column.align === "right" ? "text-right tabular-nums" : ""}`;

  return (
    // Tables are the one place horizontal scroll is correct rather than a bug: a
    // ten-column console table cannot reflow to 320px without losing columns.
    // ScrollRegion makes that overflow keyboard-reachable (audit A11Y-3).
    <ScrollRegion ariaLabel={caption} axis="x" className="bg-surface">
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
        {expand ? (
          <ExpandableRows
            colSpan={visible.length}
            rows={rows.map((row) => ({
              key: rowKey(row),
              label: rowLabel?.(row) ?? rowKey(row),
              cells: visible.map((column) => ({
                key: column.key,
                className: cellClass(column),
                node: column.render(row),
              })),
              detail: expand(row),
            }))}
          />
        ) : (
          // Flat rows, but still findable: global search has to be able to
          // point at a row here too, not just on the expandable tables.
          <FocusableRows
            rows={rows.map((row) => ({
              key: rowKey(row),
              cells: visible.map((column) => ({
                key: column.key,
                className: cellClass(column),
                node: column.render(row),
              })),
            }))}
          />
        )}
      </table>
    </ScrollRegion>
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

/** First letters of the first two words — "Priya Sharma" → "PS". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * A person cell (V7 `.p-cell`): a gold-light avatar of the name's initials
 * beside the name, optionally with a smaller sub-line. Several panels lead with
 * this, so it lives here rather than in each.
 */
export function PersonCell({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gold-light text-sm font-semibold text-gold-dark"
      >
        {initials(name)}
      </span>
      <div>
        <div className="text-base font-medium text-ink">{name}</div>
        {sub ? <div className="mt-0.5 text-sm text-ink-muted">{sub}</div> : null}
      </div>
    </div>
  );
}
