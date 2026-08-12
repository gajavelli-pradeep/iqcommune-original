import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SUBMIT_FAILURE } from "@/content/submit-failure";

import type { SessionRequestInput } from "@/lib/schemas/session-request";

import { PostSessionModal } from "./PostSessionModal";
import { RequestModal, draftSessionMailto } from "./RequestModal";

/**
 * The two dialogs, and specifically the states the content-parity gate cannot
 * reach on its own: a successful submission, and a rejected one.
 *
 * `fetch` is stubbed rather than the service mocked — the component's contract
 * is with the HTTP route, so that is the seam worth holding still.
 */

/**
 * The dialog's receipt heading (2026-08-12 delivery). Deliberately NOT the
 * confirmation email's subject: the client specified the on-screen receipt in
 * the landing-page delivery and the email separately, and the two differ in
 * register. `tests/unit/email.test.ts` covers the email wording.
 */
const RECEIPT_HEADING = "You're on the list!";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Text is filled with change events rather than `user.type`. Typing character
 * by character through a twelve-field form pushed this past the 5s limit under
 * full-suite load; the assertions here are about the receipt and the error
 * path, and keystroke handling is covered by the shorter tests.
 */
async function fillRequestForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Organisations & Institutions" }));

  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  fill("Organisation name", "TechCorp India");
  fill("First name", "Rohan");
  fill("Last name", "Mehta");
  fill("Email address", "rohan@example.com");
  fill("Phone number", "+91 98765 43210");
  fill("City", "Mumbai");
  fill("State", "Maharashtra");

  await user.selectOptions(screen.getByLabelText("Topic of interest"), "Equity Investing Simplified");
  await user.click(screen.getByRole("checkbox"));
}

describe("RequestModal", () => {
  it("shows the receipt after a successful submission", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, { data: { id: "abc", createdAt: "now" }, error: null });

    render(<RequestModal open onClose={() => {}} />);
    await fillRequestForm(user);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: RECEIPT_HEADING })).toBeInTheDocument();
    });
    // Greeted by the first name typed above, as V7 does.
    expect(
      screen.getByText(
        "Thanks, Rohan — you're on the waitlist. We'll notify you the moment sessions open in your city.",
      ),
    ).toBeInTheDocument();
    // The receipt must not quote a reply window: sessions are not scheduled on
    // arrival during the waitlist phase, and the confirmation email says so too.
    expect(screen.queryByText(/working days/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/session-requests", expect.anything());
  });

  it("does not submit an incomplete form, and says which field is wrong", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, {});

    render(<RequestModal open onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("moves focus to the first rejected field so it cannot be missed", async () => {
    // The reported failure: submitting an incomplete form appeared to do
    // nothing. The error renders beside its field, which on this thirteen-field
    // dialog is usually scrolled out of sight, so the button just looked broken.
    const user = userEvent.setup();
    mockFetch(201, {});

    render(<RequestModal open onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    // Nothing is filled in, so the audience picker is the first thing wrong —
    // and it comes before every text field in the DOM.
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Group (register as SPOC)" }),
      );
    });
  });

  it("moves focus past the fields that are already answered", async () => {
    // Proves it lands on the FIRST remaining problem rather than always the top
    // of the form — the part that makes it useful on a second attempt.
    const user = userEvent.setup();
    mockFetch(201, {});

    render(<RequestModal open onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Organisations & Institutions" }));
    fireEvent.change(screen.getByLabelText("Organisation name"), {
      target: { value: "TechCorp India" },
    });
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Rohan" } });
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("Last name"));
    });
  });

  it("surfaces a server failure without claiming success", async () => {
    const user = userEvent.setup();
    mockFetch(500, {
      data: null,
      error: { code: "INTERNAL", message: "Something went wrong sending your request.", traceId: "t-1" },
    });

    render(<RequestModal open onClose={() => {}} />);
    await fillRequestForm(user);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    // A server fault shows the client's copy, not the API's message.
    expect(await screen.findByRole("alert")).toHaveTextContent(SUBMIT_FAILURE.message);
    expect(screen.queryByRole("heading", { name: RECEIPT_HEADING })).not.toBeInTheDocument();
  });

  it("offers a drafted mailto on a server fault, carrying what was typed", async () => {
    const user = userEvent.setup();
    mockFetch(500, {
      data: null,
      error: { code: "INTERNAL", message: "Something went wrong sending your request.", traceId: "t-1" },
    });

    render(<RequestModal open onClose={() => {}} sessionEmail="session@iqcommune.com" />);
    await fillRequestForm(user);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    const link = await screen.findByRole("link", { name: "Open pre-filled email" });
    // The address stays readable as text: right-click → copy is the only rescue
    // when no mail client is registered for mailto:.
    expect(screen.getByText(/session@iqcommune\.com/)).toBeInTheDocument();

    const href = decodeURIComponent(link.getAttribute("href") ?? "");
    expect(href).toContain("mailto:session@iqcommune.com");
    // Client subject format, MOM 2026-08-10: first name and the topic, which is
    // what "Module Name" refers to — the topic options are the module names.
    expect(href).toContain(
      "New Session Request - Rohan - Equity Investing Simplified (offline request)",
    );
    // The point of the draft: the details survive the failure. These are the
    // SESSION form's fields — an earlier proposal pasted the practitioner list
    // here, which would have arrived useless.
    expect(href).toContain("Email: rohan@example.com");
    expect(href).toContain("Organisation: TechCorp India");
    expect(href).toContain("Topic: Equity Investing Simplified");
    expect(href).toContain("Who this is for: Organisations & Institutions");
    // None of the practitioner form's questions belong here.
    expect(href).not.toContain("T-shirt size");
    expect(href).not.toContain("Years of experience");
  });

  it("does not offer the mailto for a validation failure", async () => {
    const user = userEvent.setup();
    mockFetch(400, {
      data: null,
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the highlighted fields.",
        traceId: "t-2",
        fields: { topic: "Topic of interest is required" },
      },
    });

    render(<RequestModal open onClose={() => {}} sessionEmail="session@iqcommune.com" />);
    await fillRequestForm(user);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    expect(await screen.findByText("Please check the highlighted fields.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open pre-filled email" })).not.toBeInTheDocument();
  });

  it("asks groups for venue details, and does not ask anyone else", async () => {
    const user = userEvent.setup();
    render(<RequestModal open onClose={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Group (register as SPOC)" }));
    expect(screen.getByLabelText("Your venue details")).toBeInTheDocument();
    expect(screen.queryByLabelText("Organisation name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AMC / Wealth Firm" }));
    expect(screen.queryByLabelText("Your venue details")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Firm name")).toBeInTheDocument();
  });
});

describe("PostSessionModal", () => {
  it("shows the receipt after a successful submission", async () => {
    const user = userEvent.setup();
    mockFetch(201, { data: { id: "abc", photoCount: 1 }, error: null });

    render(<PostSessionModal open onClose={() => {}} />);
    await user.type(screen.getByLabelText("Your name"), "Vikram Kulkarni");
    await user.type(screen.getByLabelText("Email address"), "vikram@example.com");
    fireEvent.change(screen.getByLabelText("Date of session"), { target: { value: "2026-06-20" } });
    await user.selectOptions(screen.getByLabelText("Module taught"), "Equity Investing Simplified");
    await user.upload(
      screen.getByLabelText("Choose session photos"),
      new File(["x"], "room.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Submit photos" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Photos received — thank you." }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/We'll process and add them to the gallery/)).toBeInTheDocument();
  });

  it("refuses to submit without at least one photo", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, {});

    render(<PostSessionModal open onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Submit photos" }));

    expect(await screen.findByText("Add at least one photo")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("session offline draft", () => {
  const FORM: SessionRequestInput = {
    audience: "individual",
    firstName: "Asha",
    lastName: "Kulkarni",
    email: "asha@example.com",
    phone: "+91 98765 43210",
    city: "Pune",
    state: "Maharashtra",
    organisationName: "",
    topic: "Equity Investing Simplified",
    groupSize: "",
    preferredWindow: "",
    venueDetails: "",
    notes: "",
    spocConfirmed: false,
  };

  it("states the SPOC agreement only when that box was actually ticked", () => {
    // The consent sentence is the client's, but it may not be printed for
    // someone who never saw the box — the checkbox renders only for audiences
    // that have one. Asserting an agreement nobody gave is the opposite of what
    // a consent record is for.
    const withoutSpoc = decodeURIComponent(
      draftSessionMailto(FORM, "individual", "session@iqcommune.com"),
    );
    expect(withoutSpoc).not.toContain("responsibility of a SPOC");

    const withSpoc = decodeURIComponent(
      draftSessionMailto({ ...FORM, spocConfirmed: true }, "corporate", "session@iqcommune.com"),
    );
    expect(withSpoc).toContain("responsibility of a SPOC");
    expect(withSpoc).toContain("minimum attendance commitment");
  });

  it("keeps the longest possible request inside the mailto ceiling", () => {
    // Same silent truncation as the application draft: past ~2,048 characters
    // Windows' handler drops the tail without saying so.
    const longest: SessionRequestInput = {
      ...FORM,
      firstName: "F".repeat(80),
      lastName: "L".repeat(80),
      email: `${"a".repeat(50)}@example.com`,
      city: "C".repeat(80),
      state: "S".repeat(80),
      organisationName: "O".repeat(160),
      topic: "T".repeat(160),
      groupSize: "G".repeat(40),
      preferredWindow: "P".repeat(160),
      venueDetails: "V".repeat(500),
      notes: "N".repeat(1000),
      spocConfirmed: true,
    };

    const href = draftSessionMailto(longest, "corporate", "session@iqcommune.com");
    expect(href.length).toBeLessThanOrEqual(2048);
    // Still a usable draft, not a stub.
    expect(decodeURIComponent(href)).toContain("Email: aaaaa");
  });
});
