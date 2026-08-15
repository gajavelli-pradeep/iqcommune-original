import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const composeDraft = vi.fn();
const recordWhatsAppOpened = vi.fn();
vi.mock("./actions", () => ({
  composeDraft: (...args: unknown[]) => composeDraft(...args),
  recordWhatsAppOpened: (...args: unknown[]) => recordWhatsAppOpened(...args),
}));

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

/**
 * The WhatsApp half is copy only — there is no provider behind it. So the tab
 * exists to get the text out of the dialog, and these hold the two ways that
 * fails silently: a tab offered for a send the document never wrote copy for,
 * and a Copy button that reports success when the clipboard refused.
 */
describe("DraftModal — WhatsApp tab", () => {
  const WITH_WHATSAPP = { ...READY, whatsapp: "Hi Vikram, this is iqcommune.\n\n— iqcommune team" };

  /** Must run AFTER `userEvent.setup()`, which installs a clipboard stub of its
   *  own and would otherwise replace this one. */
  function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  }

  it("offers no tab for a send the document has no WhatsApp copy for", async () => {
    composeDraft.mockResolvedValue(READY);

    render(<DraftModal kind="request-cancellation" id="request-1" onClose={() => {}} onSend={vi.fn()} />);

    await screen.findByLabelText("Message");
    expect(screen.queryByRole("tab", { name: "WhatsApp" })).toBeNull();
  });

  it("shows the WhatsApp copy, read-only, once the tab is chosen", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    const user = userEvent.setup();

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);

    await user.click(await screen.findByRole("tab", { name: "WhatsApp" }));

    const message = screen.getByRole("textbox", { name: "WhatsApp message" });
    expect(message).toHaveValue(WITH_WHATSAPP.whatsapp);
    // Not editable on purpose: nothing here is sent, so an edit would be lost.
    expect(message).toHaveAttribute("readonly");
    // The email half is hidden, not unmounted — the edit survives a tab switch.
    expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
  });

  it("copies the message and says it did", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    stubClipboard(writeText);

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);

    await user.click(await screen.findByRole("tab", { name: "WhatsApp" }));
    await user.click(screen.getByRole("button", { name: /copy message/i }));

    expect(writeText).toHaveBeenCalledWith(WITH_WHATSAPP.whatsapp);
    expect(await screen.findByText(/copied to clipboard/i)).toBeTruthy();
  });

  it("points at the text instead of claiming success when the clipboard refuses", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    const user = userEvent.setup();
    stubClipboard(() => Promise.reject(new Error("denied")));

    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);

    await user.click(await screen.findByRole("tab", { name: "WhatsApp" }));
    await user.click(screen.getByRole("button", { name: /copy message/i }));

    expect(await screen.findByText(/select the text above instead/i)).toBeTruthy();
    expect(screen.queryByText(/copied to clipboard/i)).toBeNull();
  });
});

/**
 * The footer belongs to whichever tab is open.
 *
 * It used to be the email send regardless, so an admin reading the WhatsApp copy
 * and pressing the only button on screen sent the email — two different messages
 * on two different channels behind one control.
 */
describe("the send follows the tab", () => {
  const WITH_WHATSAPP = {
    ...READY,
    whatsapp: "Hi Vikram, how was your session?",
    phone: "9876543210",
  };

  const openWhatsAppTab = async () => {
    const user = userEvent.setup();
    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);
    await user.click(await screen.findByRole("tab", { name: "WhatsApp" }));
    return user;
  };

  it("offers the email send on the email tab and no WhatsApp button", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    render(<DraftModal kind="rating-request" id="assignment-1" onClose={() => {}} onSend={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /click to send/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open in whatsapp/i })).not.toBeInTheDocument();
  });

  it("swaps to the WhatsApp link and withdraws the email send", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    await openWhatsAppTab();

    expect(screen.getByRole("link", { name: /open in whatsapp/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /click to send/i })).not.toBeInTheDocument();
  });

  it("addresses the link to the recipient with the WhatsApp copy, not the email body", async () => {
    // The two halves are different messages. Sending the email body over
    // WhatsApp would deliver a subject line's worth of formality into a chat.
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    await openWhatsAppTab();

    const href = screen.getByRole("link", { name: /open in whatsapp/i }).getAttribute("href");
    expect(href).toContain("https://wa.me/919876543210");
    expect(href).toContain(encodeURIComponent("how was your session?"));
    expect(href).not.toContain(encodeURIComponent("Please rate it."));
  });

  it("says so rather than offering a dead button when no number is on file", async () => {
    composeDraft.mockResolvedValue({ ...WITH_WHATSAPP, phone: null });
    await openWhatsAppTab();

    expect(screen.queryByRole("link", { name: /open in whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no number on file/i)).toBeInTheDocument();
  });

  it("records the open without claiming the message was sent", async () => {
    composeDraft.mockResolvedValue(WITH_WHATSAPP);
    const user = await openWhatsAppTab();

    await user.click(screen.getByRole("link", { name: /open in whatsapp/i }));
    expect(recordWhatsAppOpened).toHaveBeenCalledWith("rating-request", "assignment-1");
  });
});
