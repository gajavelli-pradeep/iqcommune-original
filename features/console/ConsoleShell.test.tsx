import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConsoleShell } from "./ConsoleShell";

/**
 * Only the backend-status banner (`failedTabs`) and the panel-slot remount
 * guarantee are covered here — the rest of the shell (search, role preview)
 * is exercised through the console pages themselves, and re-testing all of
 * that against a bare `ConsoleShell` render would just be a slower, more
 * brittle copy of it.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const saveTab = vi.fn<(tabId: string, rows: unknown) => Promise<void>>(async () => undefined);

vi.mock("@/lib/consoleCache", () => ({
  saveTab: (...args: unknown[]) => saveTab(...(args as [string, unknown])),
  loadTab: async () => null,
}));

/** `useState`'s initializer only runs on mount, never on a prop-only update —
 *  so this reads back the label it was FIRST mounted with unless the caller
 *  actually remounted it. Stands in for `CachedPanel`'s `cached` state, which
 *  the tab-switch bug (see `ConsoleShell.tsx`'s panel slot) left holding the
 *  PREVIOUS tab's value for exactly this reason. */
function MountProbe({ label }: { label: string }) {
  const [mountedWith] = useState(label);
  return <p data-testid="probe">{mountedWith}</p>;
}

describe("ConsoleShell — backend status banner", () => {
  it("renders no banner when failedTabs is absent", () => {
    render(<ConsoleShell role="admin" email="admin@example.com" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders no banner when failedTabs is empty", () => {
    render(<ConsoleShell role="admin" email="admin@example.com" failedTabs={[]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the known-issue banner when failedTabs has entries", () => {
    render(<ConsoleShell role="admin" email="admin@example.com" failedTabs={["practitioners"]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/technical issue on our end/i);
  });
});

describe("ConsoleShell — sidebar badge on a failed tab", () => {
  it("shows the real count when the tab's read succeeded", () => {
    render(<ConsoleShell role="admin" email="admin@example.com" counts={{ practitioners: 5 }} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows an em dash instead of a misleading 0 when the tab's read failed", () => {
    // `loadConsolePanels` reports `count: 0` for a failed read — rendering
    // that as-is would read as "queue cleared" on the exact tab this badge
    // exists to flag as urgent, during the one moment (a backend outage) an
    // operator most needs the real number.
    render(
      <ConsoleShell
        role="admin"
        email="admin@example.com"
        counts={{ practitioners: 0 }}
        failedTabs={["practitioners"]}
      />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ConsoleShell — caches every tab, not just the active one", () => {
  it("mirrors an unopened tab's rows into the cache from tabReads alone", async () => {
    // Practitioners is the default active tab; Payouts is never clicked in
    // this test. Only ConsoleShell's always-mounted CacheAllTabs — not the
    // Payouts CachedPanel, which never mounts — can be responsible for this.
    render(
      <ConsoleShell
        role="admin"
        email="admin@example.com"
        tabReads={[
          { tabId: "practitioners", rows: [{ id: "p1" }], failed: false },
          { tabId: "payouts", rows: [{ id: "pay1" }], failed: false },
        ]}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveTab).toHaveBeenCalledWith("payouts", [{ id: "pay1" }]);
  });
});

describe("ConsoleShell — sidebar stacking", () => {
  it("carries an explicit z-index once it goes sticky, so scrolled table content cannot paint over it", () => {
    // Client, 2026-08-18: the sidebar had no stacking priority at all, unlike
    // the header just above it — a horizontally-scrolled table's own
    // `position: relative` wrapper, being later in the DOM, could otherwise
    // paint over rather than under it.
    render(<ConsoleShell role="admin" email="admin@example.com" />);
    expect(screen.getByRole("navigation", { name: "Console sections" }).className).toContain(
      "min-[900px]:z-[var(--z-sticky)]",
    );
  });
});

describe("ConsoleShell — panel slot remounts on tab switch", () => {
  it("does not carry the previous tab's component state into the newly active tab", async () => {
    const user = userEvent.setup();
    render(
      <ConsoleShell
        role="admin"
        email="admin@example.com"
        panels={{
          practitioners: <MountProbe label="practitioners" />,
          agreements: <MountProbe label="agreements" />,
        }}
      />,
    );

    expect(screen.getByTestId("probe")).toHaveTextContent("practitioners");

    await user.click(screen.getByRole("button", { name: "Agreements" }));

    // Every simple-row tab renders through the same component type
    // (`CachedPanel`) in production; without a `key` on the panel slot, React
    // reconciles the new tab's props onto the OLD tab's fiber instead of
    // remounting, so `useState`'s initializer never re-runs and this would
    // still read "practitioners" — exactly the bug that let one tab's cached
    // rows render through another tab's panel component.
    expect(screen.getByTestId("probe")).toHaveTextContent("agreements");
  });
});
