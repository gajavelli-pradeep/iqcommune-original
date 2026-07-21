import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsoleTable, type ColumnDef } from "./ConsoleTable";

/**
 * The table is where role gating becomes real, so it is tested as access
 * control rather than as presentation.
 */

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Priya Sharma" },
  { id: "2", name: "Vikram Kulkarni" },
];

const COLUMNS: ReadonlyArray<ColumnDef<Row>> = [
  { key: "name", header: "Practitioner", render: (row) => row.name },
  {
    key: "actions",
    header: "Actions",
    requires: "mutate",
    render: () => <button type="button">Edit</button>,
  },
  {
    key: "override",
    header: "Override",
    requires: "override",
    render: () => <button type="button">Override</button>,
  },
];

function renderTable(role: Parameters<typeof ConsoleTable<Row>>[0]["role"]) {
  return render(
    <ConsoleTable
      caption="Practitioners"
      columns={COLUMNS}
      rows={ROWS}
      role={role}
      rowKey={(row) => row.id}
    />,
  );
}

describe("ConsoleTable", () => {
  it("does not render a gated column for a role without the capability", () => {
    // Not hidden — absent. A hidden button is still in the DOM, still
    // focusable, and still wired.
    renderTable("user");
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("gives an admin edit but not override", () => {
    renderTable("admin");
    // One control per row, so the assertion counts rather than expecting one.
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(ROWS.length);
    expect(screen.queryByRole("button", { name: "Override" })).not.toBeInTheDocument();
  });

  it("gives the global admin every column", () => {
    renderTable("global_admin");
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(ROWS.length);
    expect(screen.getAllByRole("button", { name: "Override" })).toHaveLength(ROWS.length);
  });

  it("drops the header of a gated column, not just its cells", () => {
    // A header with no cells under it reads as missing data rather than as an
    // absent privilege.
    renderTable("user");
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
  });

  it("says so when there is nothing to show", () => {
    render(
      <ConsoleTable
        caption="Practitioners"
        columns={COLUMNS}
        rows={[]}
        role="global_admin"
        rowKey={(row) => row.id}
        empty="No practitioners yet."
      />,
    );
    expect(screen.getByText("No practitioners yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
