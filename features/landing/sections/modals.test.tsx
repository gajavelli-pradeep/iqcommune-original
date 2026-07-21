import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostSessionModal } from "./PostSessionModal";
import { RequestModal } from "./RequestModal";

/**
 * The two dialogs, and specifically the states the content-parity gate cannot
 * reach on its own: a successful submission, and a rejected one.
 *
 * `fetch` is stubbed rather than the service mocked — the component's contract
 * is with the HTTP route, so that is the seam worth holding still.
 */

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
      expect(screen.getByRole("heading", { name: "Request received!" })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/your session request is in. We'll be in touch within 2–3 working days/),
    ).toBeInTheDocument();
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

  it("surfaces a server failure without claiming success", async () => {
    const user = userEvent.setup();
    mockFetch(500, {
      data: null,
      error: { code: "INTERNAL", message: "Something went wrong sending your request.", traceId: "t-1" },
    });

    render(<RequestModal open onClose={() => {}} />);
    await fillRequestForm(user);
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Something went wrong/);
    expect(screen.queryByRole("heading", { name: "Request received!" })).not.toBeInTheDocument();
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
