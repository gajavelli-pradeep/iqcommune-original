import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConsentPanel } from "./ConsentPanel";
import { generateConfirmation } from "../actions";
import type { ConfirmableSession, ConsentRow } from "@/services/console";

/**
 * The Next step column is the whole point of the tab: one row, one next action.
 * `consent-stage.test.ts` proves the rule picks the right stage; these prove the
 * cell renders the control that stage calls for, and — more importantly — that
 * it renders no others.
 *
 * The negative assertions are the ones that matter. A cell offering two actions
 * is the state the column exists to prevent, and a cancelled session still
 * offering to chase consent is the one that reaches a practitioner.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("../actions", () => ({
  generateConfirmation: vi.fn(async () => ({ ok: true })),
  overrideConfirmationField: vi.fn(async () => ({ ok: true })),
  sendConsentRequest: vi.fn(async () => ({ ok: true })),
  sendPhotoGuide: vi.fn(async () => ({ ok: true })),
  setSessionStatus: vi.fn(async () => ({ ok: true })),
}));

const SENT = "2026-08-14T10:00:00.000Z";

const row = (overrides: Partial<ConsentRow>): ConsentRow => ({
  id: "a1",
  sessionId: "s1",
  reference: "IQC-CONF-0001",
  session: "IQC-S0001",
  sessionDate: "20 Aug 2026",
  practitioner: "Priya Sharma",
  grossPayout: "₹12,000",
  status: "Pending",
  recordedOn: "—",
  sessionStatus: "Pending",
  issuedOn: "14 Aug 2026",
  issuedMonth: "2026-08",
  requestSentAt: null,
  requestSentLabel: null,
  guideSentAt: null,
  ...overrides,
});

/**
 * Every action the Next step column can offer. Asserting their absence by name
 * is unambiguous where asserting on text is not — "Delivered" also appears in
 * the Session status cell, and a terminal row is defined by what it does not
 * offer rather than by what it says.
 */
const NO_ACTIONS = [
  "Send consent request",
  "Resend",
  "Confirm the session",
  "Send photo guide email",
] as const;

const expectNothingOffered = () => {
  for (const name of NO_ACTIONS) {
    expect(screen.queryByRole("button", { name }), name).not.toBeInTheDocument();
  }
};

const show = (only: Partial<ConsentRow>) =>
  render(<ConsentPanel rows={[row(only)]} role="global_admin" confirmable={[]} />);

describe("Next step — one action per stage", () => {
  it("asks for consent when nothing has been sent", () => {
    show({});
    expect(screen.getByRole("button", { name: "Send consent request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm the session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /photo guide/i })).not.toBeInTheDocument();
  });

  it("shows how long it has been waiting, and offers a resend", () => {
    show({ requestSentAt: SENT, requestSentLabel: "3 days ago" });
    expect(screen.getByText(/Sent 3 days ago/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send consent request" })).not.toBeInTheDocument();
  });

  it("offers the confirm only once consent is in", () => {
    show({ status: "Received", requestSentAt: SENT });
    expect(screen.getByRole("button", { name: /confirm the session/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /consent request|resend/i })).not.toBeInTheDocument();
  });

  it("offers the guide once the session is confirmed", () => {
    show({ status: "Received", sessionStatus: "Confirmed" });
    expect(screen.getByRole("button", { name: "Send photo guide email" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm the session/i })).not.toBeInTheDocument();
  });

  it("has nothing to ask once the guide has gone", () => {
    show({ status: "Received", sessionStatus: "Confirmed", guideSentAt: SENT });
    expect(screen.getByText(/waiting for the session/i)).toBeInTheDocument();
    expectNothingOffered();
  });
});

describe("Next step — the rows that must stop asking", () => {
  /**
   * The one that reaches a person. A cancelled session offering "Send consent
   * request" asks a practitioner to agree to something nobody will run.
   */
  it("offers nothing on a cancelled session, even with consent outstanding", () => {
    show({ sessionStatus: "Cancelled" });
    expect(screen.getByText(/no longer in progress/i)).toBeInTheDocument();
    expectNothingOffered();
  });

  it("offers nothing on a delivered session", () => {
    show({ status: "Received", sessionStatus: "Completed" });
    // "Delivered" also renders under the Session status select, so the row is
    // identified by offering nothing rather than by the word.
    expect(screen.getAllByText(/^Delivered$/).length).toBeGreaterThan(0);
    expectNothingOffered();
  });
});

describe("Download Signed Consent means what it says", () => {
  it("withholds the download until it has actually been signed", () => {
    show({ requestSentAt: SENT, requestSentLabel: "3 days ago" });
    expect(screen.getByText(/not signed yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Download$/ })).not.toBeInTheDocument();
  });

  it("offers it once consent is in", () => {
    show({ status: "Received" });
    expect(screen.getByRole("link", { name: /Download/ })).toBeInTheDocument();
    expect(screen.queryByText(/not signed yet/i)).not.toBeInTheDocument();
  });

  /**
   * The unsigned confirmation still has a use — an admin who cannot reach the
   * practitioner sends it by hand — so gating the column must not remove it.
   */
  it("keeps the offline fallback while consent is outstanding", () => {
    show({});
    expect(screen.getByRole("link", { name: /fallback, for sending offline/i })).toBeInTheDocument();
  });
});

describe("a view-only role", () => {
  it("gets no next step, but can still read the table", () => {
    render(<ConsentPanel rows={[row({ status: "Received" })]} role="user" confirmable={[]} />);
    expect(screen.queryByRole("button", { name: /send|confirm/i })).not.toBeInTheDocument();
    expect(screen.getByText("IQC-CONF-0001")).toBeInTheDocument();
  });
});

/**
 * Part 1's three "(admin enters)" fields, as they appear before anyone types.
 *
 * They used to open at 10:00 AM and 3 hours — values no admin had chosen, on a
 * document a practitioner signs. `confirmation-fields.test.ts` proves the guard
 * refuses them; these prove the form actually presents them as empty, which is
 * the half a unit test cannot see. A dropdown with no empty option silently
 * selects its first item, so "the state is empty" and "the control shows
 * nothing" are two different claims.
 */
describe("the fields the admin fills in open empty", () => {
  const confirmable: ConfirmableSession = {
    id: "a1",
    sessionReference: "IQC-S0001",
    confirmationReference: "IQC-CONF-0001",
    practitioner: "Priya Sharma",
    agreementReference: "IQC-AGR-0001",
    module: "Equity Investing Simplified",
    // A date already on the record — the box must still open blank.
    sessionDate: "2026-08-16",
    city: "Mumbai",
    state: "Maharashtra",
    venue: "Kotak Securities, BKC",
    participants: "16-25",
    spoc: "Rahul Mehta",
    audience: "corporate",
    grossPayout: 12000,
    currency: "INR",
    startTime: null,
    durationMinutes: null,
    consentGiven: false,
    confirmationGenerated: false,
  };

  const openForm = async () => {
    const user = userEvent.setup();
    render(<ConsentPanel rows={[]} role="global_admin" confirmable={[confirmable]} />);
    await user.selectOptions(screen.getByLabelText(/select confirmed session/i), "a1");
    return user;
  };

  it("shows no date, no time and no duration", async () => {
    await openForm();
    expect(screen.getByLabelText<HTMLInputElement>(/session date/i).value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("Hour").value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("Minute").value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("AM or PM").value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>(/duration/i).value).toBe("");
  });

  it("offers a placeholder in each picker, not a real value", async () => {
    // Without these the browser picks "01" and "3 hours" on the admin's behalf.
    await openForm();
    expect(screen.getByRole("option", { name: "Hour" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Min" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "AM/PM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Select duration" })).toBeInTheDocument();
  });

  it("keeps what the admin picks", async () => {
    const user = await openForm();
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("Hour"), "02");
    expect(screen.getByLabelText<HTMLSelectElement>("Hour").value).toBe("02");
  });

  it("sends the blanks through, so the guard can name them", async () => {
    // The link between an empty form and the error message. Without this the
    // other two tests and `confirmation-fields.test.ts` could both pass while
    // the panel quietly substituted the stored date or a half-built "10:" on
    // the way out — which is exactly what it used to do.
    const user = await openForm();
    await user.click(screen.getByRole("button", { name: /generate confirmation/i }));
    expect(vi.mocked(generateConfirmation)).toHaveBeenCalledWith("a1", {
      sessionDate: "",
      startTime: "",
      durationHours: 0,
    });
  });
});
