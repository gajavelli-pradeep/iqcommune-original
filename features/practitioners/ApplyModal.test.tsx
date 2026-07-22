import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplyModal } from "./ApplyModalBody";

/** The component's contract is with the HTTP route, so that is the seam held still. */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The states the parity gate cannot drive: a rejected form, and the receipt.
 *
 * Text fields are filled with change events rather than `user.type`. Typing
 * character by character through a fourteen-field form pushed this test past
 * the 5s limit under full-suite load — the assertion is about the receipt, not
 * about keystroke handling, which the shorter tests already cover.
 */

const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("ApplyModal", () => {
  it("refuses to submit until every consent is given", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, {});
    render(<ApplyModal open onClose={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Submit Application" }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Please confirm the disclosure terms")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Application received!" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ships its consent boxes unticked", () => {
    // A pre-ticked consent box is not consent.
    render(<ApplyModal open onClose={() => {}} />);
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });

  it("shows the receipt once a complete application is submitted", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, { data: { id: "abc", createdAt: "now" }, error: null });
    render(<ApplyModal open onClose={() => {}} />);

    fill("First name", "Vikram");
    fill("Last name", "Kulkarni");
    fill("Personal email address", "vikram@gmail.com");
    fill("Phone number", "+91 98765 43210");
    fill("Current job title", "Equity Analyst");
    fill("City you're based in", "Mumbai");
    fill("State", "Maharashtra");
    fill("Communication address (include PIN code)", "12 Marine Drive, Mumbai — 400020");
    fill(/why do you want to do this/, "I want a room that is already interested.");

    await user.click(screen.getByRole("checkbox", { name: /Equity Investing Simplified/ }));
    for (const consent of screen.getAllByRole("checkbox", {
      name: /I understand|I confirm|I acknowledge/,
    })) {
      await user.click(consent);
    }

    await user.click(screen.getByRole("button", { name: "Submit Application" }));

    expect(
      await screen.findByRole("heading", { name: "Application received!" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/applications", expect.anything());
    expect(screen.getByText(/we'll reach out within 2–3 working days/)).toBeInTheDocument();
  });
});
