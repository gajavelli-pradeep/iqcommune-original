import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CachedPanel } from "./CachedPanel";

const saveTab = vi.fn<(tabId: string, rows: unknown) => Promise<void>>(async () => undefined);
const loadTab = vi.fn<
  (tabId: string) => Promise<{ rows: unknown; savedAt: number } | null>
>(async () => null);

vi.mock("@/lib/consoleCache", () => ({
  saveTab: (...args: unknown[]) => saveTab(...(args as [string, unknown])),
  loadTab: (...args: unknown[]) => loadTab(...(args as [string])),
}));

beforeEach(() => {
  saveTab.mockClear();
  loadTab.mockClear();
});

// A minimal stand-in registry — the real one just wires row types to real
// panel components, which isn't what this test is proving. This test proves
// CachedPanel picks the right rows (live vs. cached) and the right message
// (cache hit vs. miss), not that any particular panel renders correctly.
vi.mock("./renderers", () => ({
  PANEL_RENDERERS: {
    demo: (rows: readonly unknown[]) => <p>Live rows: {rows.length}</p>,
  },
}));

describe("CachedPanel — live read succeeded", () => {
  it("renders the panel from the live rows", () => {
    render(<CachedPanel tabId="demo" role="admin" rows={[{ id: "1" }, { id: "2" }]} failed={false} />);

    expect(screen.getByText("Live rows: 2")).toBeInTheDocument();
  });

  it("does not write to the cache itself — CacheAllTabs owns that, for every tab, not just the active one", async () => {
    render(<CachedPanel tabId="demo" role="admin" rows={[{ id: "1" }, { id: "2" }]} failed={false} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saveTab).not.toHaveBeenCalled();
  });
});

describe("CachedPanel — live read failed, cache hit", () => {
  it("renders the cached rows through the same panel, with a saved-data note", async () => {
    loadTab.mockResolvedValueOnce({ rows: [{ id: "cached-1" }], savedAt: Date.now() - 5 * 60 * 1000 });

    render(<CachedPanel tabId="demo" role="admin" rows={null} failed />);

    expect(await screen.findByText("Live rows: 1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/showing saved data from/i);
    expect(saveTab).not.toHaveBeenCalled();
  });
});

describe("CachedPanel — live read failed, cache miss", () => {
  it("shows the no-saved-data message", async () => {
    loadTab.mockResolvedValueOnce(null);

    render(<CachedPanel tabId="demo" role="admin" rows={null} failed />);

    expect(
      await screen.findByText("This section couldn't load, and there's no saved data yet."),
    ).toBeInTheDocument();
  });
});
