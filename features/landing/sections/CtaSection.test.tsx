import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RequestSessionProvider } from "../RequestSession";
import { CtaSection } from "./CtaSection";

describe("CtaSection", () => {
  it("renders the headline and its supporting line", () => {
    render(
      <RequestSessionProvider>
        <CtaSection />
      </RequestSessionProvider>,
    );
    expect(
      screen.getByRole("heading", {
        name: "If you are serious to improve your financial literacy",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tell us your topic and your group/)).toBeInTheDocument();
  });

  it("lists all three reassurances", () => {
    render(
      <RequestSessionProvider>
        <CtaSection />
      </RequestSessionProvider>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("No commitment — just early access")).toBeInTheDocument();
    expect(screen.getByText("Max 25 participants per session")).toBeInTheDocument();
    expect(
      screen.getByText("We'll notify you the moment sessions open in your city"),
    ).toBeInTheDocument();
  });

  it("opens the request modal from its call to action", async () => {
    const user = userEvent.setup();
    render(
      <RequestSessionProvider>
        <CtaSection />
      </RequestSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Join the Waitlist/ }));
    // The modal is now loaded on demand (next/dynamic, audit H8), so it appears
    // asynchronously — find, not get.
    expect(await screen.findByRole("dialog", { name: "Join the Waitlist" })).toBeInTheDocument();
  });
});
