import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CacheAllTabs } from "./CacheAllTabs";

const saveTab = vi.fn<(tabId: string, rows: unknown) => Promise<void>>(async () => undefined);

vi.mock("@/lib/consoleCache", () => ({
  saveTab: (...args: unknown[]) => saveTab(...(args as [string, unknown])),
}));

beforeEach(() => {
  saveTab.mockClear();
});

describe("CacheAllTabs", () => {
  it("saves every tab that loaded successfully, not just one", async () => {
    render(
      <CacheAllTabs
        tabs={[
          { tabId: "practitioners", rows: [{ id: "p1" }], failed: false },
          { tabId: "payouts", rows: [{ id: "pay1" }], failed: false },
          { tabId: "gallery", rows: [{ id: "g1" }], failed: false },
        ]}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveTab).toHaveBeenCalledTimes(3);
    expect(saveTab).toHaveBeenCalledWith("practitioners", [{ id: "p1" }]);
    expect(saveTab).toHaveBeenCalledWith("payouts", [{ id: "pay1" }]);
    expect(saveTab).toHaveBeenCalledWith("gallery", [{ id: "g1" }]);
  });

  it("skips a tab whose read failed this request — nothing fresh to cache", async () => {
    render(
      <CacheAllTabs
        tabs={[
          { tabId: "practitioners", rows: [{ id: "p1" }], failed: false },
          { tabId: "payouts", rows: null, failed: true },
        ]}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveTab).toHaveBeenCalledTimes(1);
    expect(saveTab).toHaveBeenCalledWith("practitioners", [{ id: "p1" }]);
  });

  it("renders nothing — it is a pure side-effect component", () => {
    const { container } = render(<CacheAllTabs tabs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
