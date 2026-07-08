"use client";

import React from "react";

interface Props {
  headers: string[];
  isEmpty: boolean;
  emptyText: string;
  /** Constrains table height and enables vertical scroll. Default: 65vh */
  maxHeight?: string;
  /**
   * true = table connects to a filter bar above it.
   * Applies border + bottom-only radius so the visual frame continues from the bar.
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
              {headers.map((h) => (
                <th key={h} scope="col" style={thStyle}>
                  {h}
                </th>
              ))}
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
  border: "1px solid rgba(20,18,12,.10)",
  borderRadius: "0 0 10px 10px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
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
  borderBottom: "1px solid rgba(20,18,12,.1)",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 1,
};
