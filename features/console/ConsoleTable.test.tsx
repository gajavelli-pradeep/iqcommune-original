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

  it("caps a cell's width at 30 characters and wraps the rest, rather than stretching the column", () => {
    // Client, 2026-08-18: a long value used to stretch its whole column
    // instead of wrapping, which is what dragged some tables wide enough to
    // need the horizontal scroll in the first place. Right on the `<td>`
    // itself — the one element every table layout genuinely measures,
    // regardless of what a given column happens to render inside it.
    renderTable("user");
    const cell = screen.getByText("Priya Sharma").closest("td")!;
    expect(cell.className).toContain("max-w-[30ch]");
    expect(cell.className).toContain("break-words");
  });

  it("gives the cap's 30 characters to text alone, not to the cell's own padding too", () => {
    // Client, 2026-08-18: `max-width` on a border-box element (this app's
    // default) counts its own padding against the budget, so `max-w-[30ch]`
    // on a `px-4`-padded cell was really giving text closer to 25 real
    // characters — tight enough that an ordinary word regularly missed the
    // line it should have fit on. `box-content` switches the cell back to
    // sizing `max-width` against its content alone, padding added on top, so
    // 30ch is the 30 characters the rule actually promises.
    renderTable("user");
    const cell = screen.getByText("Priya Sharma").closest("td")!;
    expect(cell.className).toContain("box-content");
    expect(cell.className).toContain("px-4");
  });

  it("never wraps a header, even one longer than most data values", () => {
    // Client, 2026-08-18: "Download Signed Agreement" (26 characters, under
    // the 30ch cap) was still wrapping on the live site. The column's width
    // came from the CELL's `ch`, measured in a plain, regular-weight font —
    // narrower per character than the header's own bold, uppercase,
    // letter-spaced one, so a header well under 30 characters still did not
    // fit the budget its own column ended up with. `whitespace-nowrap`
    // decouples the header from that entirely.
    const longHeaderColumns: ReadonlyArray<ColumnDef<Row>> = [
      { key: "name", header: "Download Signed Agreement", render: (row) => row.name },
    ];
    render(
      <ConsoleTable
        caption="Agreements"
        columns={longHeaderColumns}
        rows={ROWS}
        role="global_admin"
        rowKey={(row) => row.id}
      />,
    );
    const header = screen.getByRole("columnheader", { name: "Download Signed Agreement" });
    expect(header.className).toContain("whitespace-nowrap");
    expect(header.className).not.toContain("max-w-[30ch]");
  });

  it("caps the first column's width too, on an expandable table", () => {
    // Client, 2026-08-18: reported working for every column except the
    // first, on the one table shape the two-column test above never
    // exercises — an expandable row, where the first cell's own value sits
    // inside the row's expand-toggle button rather than directly in the
    // `<td>`. A cap that lived on a wrapper nested inside that button was not
    // reliably reaching the table's own column-width measurement, since the
    // button (`w-full`) has no width of its own to report. Asserting on the
    // `<td>` itself — where the cap actually lives now — proves this holds
    // regardless of what a column renders inside the cell.
    render(
      <ConsoleTable
        caption="Practitioners"
        columns={COLUMNS}
        rows={ROWS}
        role="user"
        rowKey={(row) => row.id}
        expand={() => <p>Detail</p>}
        rowLabel={(row) => row.name}
      />,
    );
    const toggle = screen.getByRole("button", { name: /Show details for Priya Sharma/i });
    const cell = toggle.closest("td")!;
    expect(cell.className).toContain("max-w-[30ch]");
    expect(cell.className).toContain("break-words");
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
