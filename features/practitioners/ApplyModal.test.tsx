import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SUBMIT_FAILURE } from "@/content/submit-failure";
import { MODULES, type ApplicationInput } from "@/lib/schemas/application";

import { ApplyModal, draftApplicationMailto } from "./ApplyModalBody";

/** The component's contract is with the HTTP route, so that is the seam held still. */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The other failure the fallback exists for: the request never lands at all. */
function mockUnreachableServer() {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const serverFault = {
  data: null,
  error: { code: "INTERNAL", message: "Something went wrong sending your application.", traceId: "t-1" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The states the parity gate cannot drive: a rejected form, the receipt, and
 * the mailto fallback offered when the server itself fails.
 *
 * Every field is set with change events rather than `user.type`. Typing
 * character by character through a fourteen-field form pushed this test past
 * the 5s limit under full-suite load — these assertions are about what happens
 * after submit, not about keystroke handling, which shorter tests already cover.
 */

const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Submit Application" }));

/** A complete, valid application — the shortest route to a server response. */
function fillApplication() {
  fill("First name", "Vikram");
  fill("Last name", "Kulkarni");
  fill("Personal email address", "vikram@gmail.com");
  fill("Phone number", "+91 98765 43210");
  fill("Current job title", "Equity Analyst");
  fill("City you're based in", "Mumbai");
  fill("State", "Maharashtra");
  fill("Communication address (include PIN code)", "12 Marine Drive, Mumbai — 400020");
  fill(/why do you want to do this/, "I want a room that is already interested.");
  fill("Years of experience", "5 – 8 years");
  fill("T-shirt size", "M");
  fill("How often could you teach?", "Once a month");

  fireEvent.click(screen.getByRole("checkbox", { name: /Equity Investing Simplified/ }));
  for (const consent of screen.getAllByRole("checkbox", {
    name: /I understand|I confirm|I acknowledge/,
  })) {
    fireEvent.click(consent);
  }
}

describe("ApplyModal", () => {
  it("refuses to submit until every consent is given", async () => {
    const fetchMock = mockFetch(201, {});
    render(<ApplyModal open onClose={() => {}} />);

    submit();

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

  it("ships its required selects unselected, not defaulted to a real answer", () => {
    // An untouched "T-shirt size"/"Years of experience"/"How often could you
    // teach?" must not silently submit a value the applicant never chose.
    render(<ApplyModal open onClose={() => {}} />);
    for (const label of ["Years of experience", "T-shirt size", "How often could you teach?"]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
  });

  it("shows the receipt once a complete application is submitted", async () => {
    const fetchMock = mockFetch(201, { data: { id: "abc", createdAt: "now" }, error: null });
    render(<ApplyModal open onClose={() => {}} />);

    fillApplication();
    submit();

    expect(
      await screen.findByRole("heading", { name: "Application received!" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/applications", expect.anything());
    expect(screen.getByText(/we'll reach out within 2–3 working days/)).toBeInTheDocument();
  });

  it("offers a drafted mailto on a server fault, carrying what was typed", async () => {
    mockFetch(500, serverFault);
    render(
      <ApplyModal open onClose={() => {}} practitionerEmail="practitioner@iqcommune.com" />,
    );

    fillApplication();
    submit();

    const link = await screen.findByRole("link", { name: "Open pre-filled email" });
    // The address stays readable as text: right-click → copy is the only rescue
    // when no mail client is registered for mailto:.
    expect(screen.getByText(/practitioner@iqcommune\.com/)).toBeInTheDocument();

    // The client's approved wording, pinned literally (MOM 2026-08-10). This is
    // the one place the sentences are spelled out rather than read from the copy
    // module, so an careless edit to that module fails here instead of shipping.
    expect(
      screen.getByText("Apologies! Guess something went wrong. Please try again in a few minutes."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Not to worry\. Everything you have entered has been captured in the email/),
    ).toBeInTheDocument();

    const href = decodeURIComponent(link.getAttribute("href") ?? "");
    expect(href).toContain("mailto:practitioner@iqcommune.com");
    // Client subject format, MOM 2026-08-10: first name and city, not full name.
    expect(href).toContain("New Practitioner Request - Vikram - Mumbai (offline request)");
    // The point of the draft: this form is the longer of the two, and every
    // answer survives the failure.
    expect(href).toContain("Email: vikram@gmail.com");
    expect(href).toContain("Current job title: Equity Analyst");
    expect(href).toContain("Years of experience: 5 – 8 years");
    expect(href).toContain("Modules: Equity Investing Simplified");
    // First person — the applicant is writing about themselves.
    expect(href).toContain("How often I could teach: Once a month");
    expect(href).toContain("Why I want to teach:");
    expect(href).toContain(
      'my agreement with all the disclosures appearing under "Disclosure Consent" section',
    );
  });

  it("offers the mailto when the server cannot be reached at all", async () => {
    // Composing a mailto needs no network, so this is when the offer is worth
    // the most — and it is the one path no HTTP status can describe.
    mockUnreachableServer();
    render(
      <ApplyModal open onClose={() => {}} practitionerEmail="practitioner@iqcommune.com" />,
    );

    fillApplication();
    submit();

    expect(
      await screen.findByRole("link", { name: "Open pre-filled email" }),
    ).toBeInTheDocument();
  });

  it("does not offer the mailto for a validation failure", async () => {
    // The applicant's own to fix. Emailing it would route around the schema and
    // land a malformed application in a human inbox.
    mockFetch(400, {
      data: null,
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the highlighted fields.",
        traceId: "t-2",
        fields: { phone: "Enter a valid phone number" },
      },
    });
    render(
      <ApplyModal open onClose={() => {}} practitionerEmail="practitioner@iqcommune.com" />,
    );

    fillApplication();
    submit();

    expect(await screen.findByText("Please check the highlighted fields.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open pre-filled email" })).not.toBeInTheDocument();
  });

  it("does not offer the mailto for a rate limit", async () => {
    // A rate limit exists precisely so it is not routed around.
    mockFetch(429, {
      data: null,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
        traceId: "t-3",
      },
    });
    render(
      <ApplyModal open onClose={() => {}} practitionerEmail="practitioner@iqcommune.com" />,
    );

    fillApplication();
    submit();

    expect(await screen.findByText(/Too many requests/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open pre-filled email" })).not.toBeInTheDocument();
  });

  it("keeps the longest possible application inside the mailto ceiling", () => {
    // Windows' shell handler truncates a mailto past ~2,048 characters and says
    // nothing, so the tail of the draft would vanish exactly when it matters.
    // Every field at its schema maximum reached 2,819 with a single per-field
    // clamp, which is why the draft now measures itself.
    const longest: ApplicationInput = {
      firstName: "F".repeat(80),
      lastName: "L".repeat(80),
      email: `${"a".repeat(50)}@example.com`,
      phone: "+91 98765 43210 000",
      jobTitle: "J".repeat(120),
      experience: "13 – 18 years",
      city: "C".repeat(80),
      state: "S".repeat(80),
      address: "A".repeat(400),
      tshirtSize: "3XL",
      modules: [...MODULES],
      frequency: "Flexible — depends on my schedule",
      motivation: "M".repeat(1500),
      consentDisclosure: true,
      consentNoCrossSell: true,
      consentEmployer: true,
    };

    const href = draftApplicationMailto(longest, "practitioner@iqcommune.com");
    expect(href.length).toBeLessThanOrEqual(2048);
    // Still a usable draft, not a stub: the identifying fields survive the fit.
    expect(decodeURIComponent(href)).toContain("Email: aaaaa");
    expect(decodeURIComponent(href)).toContain("Why I want to teach: MMMMM");
  });

  it("never drops a module to make room, even at the tightest fit", () => {
    // The answer the application exists to collect. Clamping it with the prose
    // left two of six and said nothing — so an applicant who writes a long note
    // would have arrived looking like they teach a third of what they do.
    const longest: ApplicationInput = {
      firstName: "F".repeat(80),
      lastName: "L".repeat(80),
      email: `${"a".repeat(50)}@example.com`,
      phone: "+91 98765 43210 000",
      jobTitle: "J".repeat(120),
      experience: "13 – 18 years",
      city: "C".repeat(80),
      state: "S".repeat(80),
      address: "A".repeat(400),
      tshirtSize: "3XL",
      modules: [...MODULES],
      frequency: "Flexible — depends on my schedule",
      motivation: "M".repeat(1500),
      consentDisclosure: true,
      consentNoCrossSell: true,
      consentEmployer: true,
    };

    const body = decodeURIComponent(draftApplicationMailto(longest, "a@b.com"));
    for (const moduleName of MODULES) expect(body).toContain(moduleName);
  });

  it("says nothing about email when no address is configured", async () => {
    // The variable is FEATURE-tier. Unset, the offer is withheld rather than
    // rendering `mailto:undefined` — a dead link is worse than no link.
    mockFetch(500, serverFault);
    render(<ApplyModal open onClose={() => {}} />);

    fillApplication();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(SUBMIT_FAILURE.message);
    expect(screen.queryByRole("link", { name: "Open pre-filled email" })).not.toBeInTheDocument();
    // The reassurance is about the email, so it must not appear without one.
    expect(screen.queryByText(/Not to worry/)).not.toBeInTheDocument();
  });
});
