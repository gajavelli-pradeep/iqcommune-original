import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

/**
 * The legally-binding e-signature flow (audit C4). `tests/parity/pending-onboarding.ts`
 * exempts the signed-receipt strings on the promise that *this file* proves they
 * render — a promise that, until now, pointed at a file that did not exist. This
 * drives the real flow: read-to-end gate → typed signature → submit → receipt,
 * and asserts every exempted string actually appears.
 */

const practitioner = {
  name: "Jane Doe",
  role: "Senior Analyst",
  organisation: "Acme Capital",
  module: "Equity Investing Simplified",
  city: "Pune",
  agreementReference: "IQC-AGR-0007",
};

afterEach(() => vi.unstubAllGlobals());

describe("OnboardingForm", () => {
  it("shows the agreement date from the server prop and blocks signing until read", () => {
    render(<OnboardingForm practitioner={practitioner} token="tok" agreementDate="1 January 2026" />);

    expect(screen.getByText("PRACTITIONER EMPANELMENT AGREEMENT")).toBeInTheDocument();
    // The server-computed IST date (audit M7), rendered verbatim.
    expect(screen.getByText("1 January 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/scroll through and read the full agreement/i),
    ).toBeInTheDocument();
  });

  it("drives read-to-end → typed signature → submit and renders the signed receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: { at: "2026-01-01T10:00:00Z" }, error: null }), {
            status: 201,
          }),
        ),
      ),
    );

    render(<OnboardingForm practitioner={practitioner} token="tok" agreementDate="1 January 2026" />);

    // Satisfy the scroll-to-end gate. jsdom has no layout, so the scroll metrics
    // are stubbed to represent a panel scrolled to its end.
    const region = screen.getByLabelText("Practitioner Empanelment Agreement");
    Object.defineProperty(region, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(region, "scrollTop", { value: 700, configurable: true, writable: true });
    fireEvent.scroll(region);
    expect(screen.getByText(/Agreement read/i)).toBeInTheDocument();

    // Typed signature — the keyboard-accessible path.
    fireEvent.click(screen.getByRole("button", { name: /type signature/i }));
    const typed = screen.getByPlaceholderText("Type your name to generate signature");
    fireEvent.change(typed, { target: { value: "Jane Doe" } });

    fireEvent.click(screen.getByRole("button", { name: /sign & complete onboarding/i }));

    await waitFor(() =>
      expect(screen.getByText("Agreement signed. Welcome to iqcommune.")).toBeInTheDocument(),
    );

    // Every string pending-onboarding.ts exempts against this test.
    expect(screen.getByText(/Your empanelment is confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/Keep an eye on your inbox/)).toBeInTheDocument();
    expect(screen.getByText("Signed by")).toBeInTheDocument();
    expect(screen.getByText("Agreement ref.")).toBeInTheDocument();
    expect(screen.getByText("Timestamp")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("✓ Digitally signed")).toBeInTheDocument();
  });

  it("keeps the submit button disabled until the agreement is read", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<OnboardingForm practitioner={practitioner} token="tok" agreementDate="1 January 2026" />);

    const submit = screen.getByRole("button", { name: /sign & complete onboarding/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
