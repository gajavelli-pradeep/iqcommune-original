import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExpandableRows } from "@/features/console/ExpandableRows";
import { FocusableRows } from "@/features/console/FocusableRows";
import { RowFocusContext } from "@/features/console/RowFocusContext";
import type { RowFocus } from "@/features/console/search";

/**
 * What a search result does after the tab opens.
 *
 * The bug these pin: `handled` was seeded with the INCOMING nonce, so a panel
 * mounting *because* of a search hit believed it had already dealt with it. The
 * row opened when its tab was already on screen and did nothing when it was
 * not — silently failing in the one case search exists for, and passing every
 * check that happened to start on the right tab.
 */

const ROWS = [
  { key: "a", label: "Row A", cells: [{ key: "c", className: "", node: "Row A" }], detail: <p>Detail A</p> },
  { key: "b", label: "Row B", cells: [{ key: "c", className: "", node: "Row B" }], detail: <p>Detail B</p> },
];

const table = (focus: RowFocus | null) =>
  render(
    <RowFocusContext.Provider value={focus}>
      <table>
        <ExpandableRows rows={ROWS} colSpan={1} />
      </table>
    </RowFocusContext.Provider>,
  );

describe("row focus", () => {
  it("opens the targeted row on a panel that mounts already focused", () => {
    // The cross-tab case: the panel did not exist when the hit was chosen.
    table({ tab: "practitioners", rowKey: "b", nonce: 1 });

    expect(screen.getByText("Detail B")).toBeInTheDocument();
    expect(screen.queryByText("Detail A")).not.toBeInTheDocument();
  });

  it("opens nothing when there is no focus", () => {
    table(null);
    expect(screen.queryByText("Detail A")).not.toBeInTheDocument();
    expect(screen.queryByText("Detail B")).not.toBeInTheDocument();
  });

  it("ignores a target that belongs to another table", () => {
    // Mid-switch, a panel can briefly see the incoming tab's row key.
    table({ tab: "sessions", rowKey: "not-here", nonce: 1 });
    expect(screen.queryByText("Detail A")).not.toBeInTheDocument();
  });

  it("re-opens the same row when it is picked again", () => {
    const view = table({ tab: "practitioners", rowKey: "a", nonce: 1 });
    expect(screen.getByText("Detail A")).toBeInTheDocument();

    // The operator closes it, then picks the same result a second time. Without
    // the nonce this is an identical value and nothing would happen.
    view.rerender(
      <RowFocusContext.Provider value={{ tab: "practitioners", rowKey: "a", nonce: 2 }}>
        <table>
          <ExpandableRows rows={ROWS} colSpan={1} />
        </table>
      </RowFocusContext.Provider>,
    );
    expect(screen.getByText("Detail A")).toBeInTheDocument();
  });

  it("marks the row on a flat table, which has nothing to open", () => {
    // Agreements and Sessions have no detail card; the row itself is the answer.
    render(
      <RowFocusContext.Provider value={{ tab: "sessions", rowKey: "b", nonce: 1 }}>
        <table>
          <FocusableRows
            rows={[
              { key: "a", cells: [{ key: "c", className: "", node: "Row A" }] },
              { key: "b", cells: [{ key: "c", className: "", node: "Row B" }] },
            ]}
          />
        </table>
      </RowFocusContext.Provider>,
    );

    const marked = document.querySelectorAll("tr[aria-current]");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute("data-row-key", "b");
  });
});
