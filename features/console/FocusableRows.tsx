"use client";

import { useRef, type ReactNode } from "react";

import { useFocusedRow } from "./RowFocusContext";

/**
 * The rows of a console table that has no detail card — Agreements, Sessions.
 *
 * These exist only so global search can answer on a flat table too. Landing an
 * operator on the right tab and leaving them to find the row among fifty is the
 * half-measure that makes search not worth using, and it is exactly what a flat
 * table would otherwise do: `ExpandableRows` carries the scroll-and-open
 * behaviour, and a table with nothing to open never rendered it.
 *
 * There is no expansion here, so the answer is the row itself: it is scrolled
 * to the middle of the viewport and marked with the same tint an open row uses,
 * which is already the console's "this is the one" signal.
 */

export interface FocusableRow {
  key: string;
  cells: ReadonlyArray<{ key: string; className: string; node: ReactNode }>;
}

export function FocusableRows({ rows }: { rows: readonly FocusableRow[] }) {
  const body = useRef<HTMLTableSectionElement>(null);
  const targeted = useFocusedRow(body, (key) => rows.some((row) => row.key === key));

  return (
    <tbody ref={body}>
      {rows.map((row) => (
        <tr
          key={row.key}
          data-row-key={row.key}
          /* `aria-current` rather than colour alone: the tint says "this one"
             to someone looking at it, and nothing at all to someone not. */
          aria-current={targeted?.rowKey === row.key ? "true" : undefined}
          className={`border-b border-border transition-colors last:border-b-0 ${
            targeted?.rowKey === row.key ? "bg-row-selected" : ""
          }`}
        >
          {row.cells.map((cell) => (
            <td key={cell.key} className={cell.className}>
              {cell.node}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
