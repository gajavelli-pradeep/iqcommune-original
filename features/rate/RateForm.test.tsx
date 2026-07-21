import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RateForm } from "./RateForm";
import type { RatedSession } from "./SessionDetailsCard";

const SESSION: RatedSession = {
  practitioner: "Vikram Kulkarni",
  module: "Equity Investing Simplified",
  sessionDate: "20 Jun 2025",
  city: "Mumbai",
  reference: "IQC-S003",
  requestedBy: "Rohan Mehta",
};

/**
 * These forms now post to a route, so `fetch` is the seam. The receipt
 * timestamp comes back from the server, which is the point of the change.
 */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RateForm", () => {
  it("cannot be submitted before a star is chosen", () => {
    render(<RateForm session={SESSION} token="test-token" />);
    expect(screen.getByRole("button", { name: "Submit rating" })).toBeDisabled();
    expect(screen.getByText("Tap a star to rate")).toBeInTheDocument();
  });

  it("names the chosen rating in words, not just in stars", async () => {
    const user = userEvent.setup();
    mockFetch(201, { data: { at: "2026-07-21T18:41:43.000Z", submittedAt: "2026-07-21T18:41:43.000Z" }, error: null });
    render(<RateForm session={SESSION} token="test-token" />);

    await user.click(screen.getByRole("radio", { name: "4 — Very good" }));
    expect(screen.getByText("4 — Very good")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit rating" })).toBeEnabled();
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    mockFetch(201, { data: { at: "2026-07-21T18:41:43.000Z", submittedAt: "2026-07-21T18:41:43.000Z" }, error: null });
    render(<RateForm session={SESSION} token="test-token" />);

    screen.getByRole("radio", { name: "1 — Poor" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("radio", { name: "3 — Good" })).toBeChecked();
  });

  it("shows the receipt after submitting", async () => {
    const user = userEvent.setup();
    mockFetch(201, { data: { at: "2026-07-21T18:41:43.000Z", submittedAt: "2026-07-21T18:41:43.000Z" }, error: null });
    render(<RateForm session={SESSION} token="test-token" />);

    await user.click(screen.getByRole("radio", { name: "5 — Excellent" }));
    await user.click(screen.getByRole("button", { name: "Submit rating" }));

    expect(
      screen.getByRole("heading", { name: "Thank you for your feedback" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5 — Excellent")).toBeInTheDocument();
    expect(screen.getByText(/If you'd like to share more/)).toBeInTheDocument();
  });
});
