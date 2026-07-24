import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ConsoleUnavailable } from "./ConsoleUnavailable";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
});

describe("ConsoleUnavailable", () => {
  it("renders without crashing, with a Try again button", () => {
    render(<ConsoleUnavailable />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it("refreshes the route when Try again is clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ConsoleUnavailable />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("auto-retries every 20 seconds and clears the timer on unmount", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ConsoleUnavailable />);
      expect(refresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(20_000);
      expect(refresh).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(20_000);
      expect(refresh).toHaveBeenCalledTimes(2);

      unmount();
      vi.advanceTimersByTime(60_000);
      expect(refresh).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
