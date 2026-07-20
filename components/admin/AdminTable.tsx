"use client";

import React from "react";

interface Props {
  headers: Array<string | { label: string; width?: number }>;
  isEmpty: boolean;
  emptyText: React.ReactNode;
  /** Constrains table height and enables vertical scroll. Default: 65vh */
  maxHeight?: string;
  /**
   * true = render the table inside its own fully-rounded card frame. V6 shows the
   * pending/filter bar and the table as two separate cards, so this is a complete
   * card (full border + radius), not a bottom-only continuation of the bar.
   */
  connected?: boolean;
  children: React.ReactNode;
}

export function AdminTable({
  headers,
  isEmpty,
  emptyText,
  maxHeight = "65vh",
  connected = false,
  children,
}: Props) {
  return (
    <div style={connected ? connectedFrame : undefined}>
      <div style={{ overflow: "auto", maxHeight }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map((h) => {
                const label = typeof h === "string" ? h : h.label;
                const width = typeof h === "string" ? undefined : h.width;
                return (
                  <th key={label} scope="col" style={width ? { ...thStyle, width } : thStyle}>
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{
                    textAlign: "center",
                    padding: "32px 12px",
                    color: "var(--ink-faint)",
                    fontSize: 13,
                  }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Shared cell padding — import alongside AdminTable in each table file. */
export const TD: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };

const connectedFrame: React.CSSProperties = {
  border: "1px solid rgba(15,17,23,.10)",
  borderRadius: 10,
  overflow: "hidden", // clip the sticky header background to the rounded corners
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  // Floor keeps columns legible when the container is narrow: the wrapper's
  // overflow:auto scrolls the table horizontally on a phone instead of crushing
  // every column. Desktop is wider than this, so width:100% wins and nothing
  // changes there.
  minWidth: 680,
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  background: "#f8f7f4",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase", // V4 renders column headers uppercase
  color: "var(--ink-faint)",
  borderBottom: "1px solid rgba(15,17,23,.1)",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 1,
};
