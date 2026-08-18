import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";

import { FocusableRows } from "./FocusableRows";
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

  // `max-w-[30ch]` (client, 2026-08-18): a long value — an email, a venue
  // name, a bundle's module name built from several real ones joined
  // together — used to stretch its whole column instead of wrapping, which
  // is what dragged some tables wide enough to need the horizontal scroll in
  // the first place. `ch` is genuinely "characters", not an approximation of
  // one; `break-words` only matters for a single unbroken run past 30
  // characters (an email, a reference) — ordinary text wraps at its own word
  // boundaries regardless.
  //
  // Both on the `<td>` itself, not on a wrapper nested inside it. A wrapper
  // worked for most cells but not the first column of an expandable row,
  // whose value sits inside the row's own `w-full` toggle button — that
  // button has no width of its own to report, so the table's column-width
  // measurement was not reliably reaching a cap nested a level below it. The
  // `<td>` is the one element every table layout genuinely measures, on every
  // row shape, so the cap belongs there regardless of what is inside it.
  //
  // `box-content` is what makes that safe to do: `max-width` on a border-box
  // element (this app's default) counts its own padding against the budget,
  // so `max-w-[30ch]` on a `px-4`-padded cell was really giving text closer
  // to 25 real characters — tight enough that an ordinary word regularly
  // missed the line it should have fit on. `box-content` switches this one
  // element back to sizing `max-width` against content alone, padding added
  // on top, so 30ch here is the 30 characters the rule actually promises.
  const cellClass = (column: ColumnDef<Row>) =>
    `max-w-[30ch] box-content break-words px-4 py-3 align-top text-base text-ink ${column.align === "right" ? "text-right tabular-nums" : ""}`;

  return (
    // No `ScrollRegion` of its own (client, 2026-08-18): the whole console
    // page now scrolls sideways together — see `ConsoleShell`'s own region,
    // wrapping the page header alongside every panel's content — rather than
    // each table owning a separate scrollbar under just itself. `w-max` still
    // does the real work either way: it forces the table to its natural,
    // unsqueezed full size — every column getting up to its own 30-character
    // cap — so there is always something genuine for the ancestor region to
    // actually overflow, wherever that ancestor now lives. Confirmed with a
    // real DevTools measurement (a cell measured 104.96px wide against a 30ch
    // cap that should allow roughly 250-270px): dropping `w-full` alone was
    // not enough, since `width: auto` on a table means shrink-to-fit
    // available space, not grow-to-natural-size, and this table's absolute
    // minimum possible width — every column wrapped to its narrowest single
    // word — was still smaller than the visible page, so nothing ever
    // overflowed and nothing forced real scrolling. `min-w-[720px]` stays as
    // the floor for a table with too few columns to reach that on its own.
    // `bg-surface` here, not on an ancestor (client, 2026-08-18): it used to
    // live on this table's own `ScrollRegion` wrapper; removing that wrapper
    // for the whole-page horizontal scroll dropped the table's background
    // along with it, since `ConsoleShell`'s outer region boxes the page
    // header too and can't paint a color scoped to just the table.
    <table className="w-max min-w-[720px] border-collapse bg-surface text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          {visible.map((column) => (
            <th
              key={column.key}
              scope="col"
              style={column.width ? { width: column.width } : undefined}
              // `whitespace-nowrap` (client, 2026-08-18): every header is
              // short by design, and none should ever wrap — but the table's
              // own auto layout sizes a column from both the header and its
              // cells together, and `1ch` in the header's bold, uppercase,
              // letter-spaced font is visually wider than `1ch` in a cell's
              // plain one. A header well under 30 characters was still
              // wrapping, because the column's width came from the CELL's
              // narrower `ch` while the header needed more room than that
              // budget gave it in its own, wider font. Keeping it on one
              // line always is what a column heading is for; `cellClass`'s
              // cap is for data values, never for the label above them.
              className={`whitespace-nowrap px-4 py-3 text-2xs font-semibold uppercase tracking-caps text-ink-faint ${
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
