import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const composeDraft = vi.fn();
vi.mock("./actions", () => ({ composeDraft: (...args: unknown[]) => composeDraft(...args) }));

const { DraftModal } = await import("./DraftModal");

/**
 * The draft dialog exists so an admin can change a message before it goes out.
 * The prototype this is ported from got that half wrong — its send button fired
 * a closure captured when the dialog opened and never read the edited text
 * back, so every edit was silently discarded. These tests hold the seam that
 * mistake lives on: what the admin typed is what `onSend` receives.
 */

afterEach(() => {
  composeDraft.mockReset();
  vi.restoreAllMocks();
});

const READY = { to: "vikram@example.com", subject: "How was your session?", body: "Hi Vikram,\n\nPlease rate it." };

describe("DraftModal", () => {
  it("shows the composed message before anything is sent", async () => {
    composeDraft.mockResolvedValue(READY);
    const onSend = vi.fn();

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={onSend} />);

    expect(await screen.findByDisplayValue("How was your session?")).toBeTruthy();
    expect(screen.getByLabelText("Message")).toHaveValue("Hi Vikram,\n\nPlease rate it.");
    // Shown twice by design, as in V7: once in the header subtitle and once on
    // the To line, so the recipient is visible whichever half is being read.
    expect(screen.getAllByText(/vikram@example\.com/).length).toBe(2);
    // The point of the dialog: nothing has gone out just by opening it.
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends what the admin edited, not what was composed", async () => {
    composeDraft.mockResolvedValue(READY);
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={onSend} />);

    const subject = await screen.findByLabelText("Subject:");
    await user.clear(subject);
    await user.type(subject, "A better subject");

    const body = screen.getByLabelText("Message");
    await user.clear(body);
    await user.type(body, "Rewritten entirely.");

    await user.click(screen.getByRole("button", { name: /click to send/i }));

    expect(onSend).toHaveBeenCalledWith({ subject: "A better subject", body: "Rewritten entirely." });
  });

  it("will not send an empty subject or an empty body", async () => {
    composeDraft.mockResolvedValue(READY);
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={onSend} />);

    await user.clear(await screen.findByLabelText("Message"));

    const send = screen.getByRole("button", { name: /click to send/i });
    expect(send.hasAttribute("disabled")).toBe(true);
    await user.click(send);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("says so when the record has gone, rather than offering an empty draft", async () => {
    composeDraft.mockResolvedValue(null);

    render(<DraftModal kind="rating-request" id="gone" onClose={() => {}} onSend={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /click to send/i })?.hasAttribute("disabled")).toBe(true);
  });

  it("surfaces a failed compose instead of hanging on the skeleton", async () => {
    composeDraft.mockRejectedValue(new Error("boom"));

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not be prepared/i));
  });
});
