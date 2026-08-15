import { cleanup, render, screen, within } from "@testing-library/react";
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
  // The draft dialog stands between every send button and its Undo window, so
  // the duplicate-send test below cannot reach one without it.
  composeDraft: vi.fn(async () => ({
    to: "priya@example.com",
    subject: "Your session confirmation",
    body: "Hi Priya,",
  })),
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
  module: "Equity Investing Simplified",
  venue: "Kotak Securities, BKC",
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

  it("draws Resend as the same pill as every other action in the column", () => {
    // It was the underlined `link` variant while its neighbours were pills, so
    // the one control that emails a practitioner a second time read as the
    // least consequential thing in the cell. Asserting the two match, rather
    // than asserting a class list, keeps this about the column being coherent.
    show({ requestSentAt: SENT, requestSentLabel: "3 days ago" });
    const resend = screen.getByRole("button", { name: "Resend" }).className;

    cleanup();
    show({});
    const send = screen.getByRole("button", { name: "Send consent request" }).className;

    expect(resend).toBe(send);
    expect(resend).not.toMatch(/underline/);
  });

  it("offers the confirm only once consent is in", () => {
    show({ status: "Received", requestSentAt: SENT });
    expect(screen.getByRole("button", { name: /confirm the session/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /consent request|resend/i })).not.toBeInTheDocument();
  });

  it("names the guide once the session is confirmed, without offering it", () => {
    // V7 keeps both photo-guide controls in Part 3. The column still has to say
    // what the row needs, or a confirmed session reads as finished.
    show({ status: "Received", sessionStatus: "Confirmed" });
    expect(screen.getByText(/send the photo guide in part 3/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm the session/i })).not.toBeInTheDocument();
  });

  it("has nothing to ask once the guide has gone", () => {
    show({ status: "Received", sessionStatus: "Confirmed", guideSentAt: SENT });
    expect(screen.getByText(/waiting for the session/i)).toBeInTheDocument();
    expectNothingOffered();
  });
});

/**
 * What the Session status cell says a session is.
 *
 * Confirmed is withheld from the options on purpose — confirming is the Next
 * step button's job, and only once consent is in. But a select cannot display
 * a value it has no option for, so the browser resolved a confirmed row to the
 * first option it did have and the cell read "Pending". Not a blank an admin
 * would question: a definite, wrong answer on the control they use to see
 * where a session stands.
 */
describe("Session status says what the session is", () => {
  const statusSelect = () => screen.getByLabelText<HTMLSelectElement>(/session status for/i);

  it("reads Confirmed once the session is confirmed", () => {
    show({ status: "Received", sessionStatus: "Confirmed" });
    expect(statusSelect().value).toBe("Confirmed");
  });

  it("lets an admin set any of the three", () => {
    // Including Confirmed, and on a row whose consent has not come back —
    // consent sometimes arrives on paper, and a session with a real agreement
    // behind it must not be stuck Pending because of how the agreement arrived.
    show({ status: "Received", sessionStatus: "Confirmed" });
    for (const option of ["Pending", "Confirmed", "Cancelled"]) {
      expect(screen.getByRole("option", { name: option }), option).toBeEnabled();
    }
  });

  it("speaks the same three states whatever the row is at", () => {
    // A list that grows from two entries to three when the row happens to be
    // confirmed makes Confirmed look like a state that does not exist yet, and
    // leaves an admin counting options to work out where a session stands.
    for (const sessionStatus of ["Pending", "Confirmed", "Cancelled"]) {
      cleanup();
      show({ status: "Received", sessionStatus });
      // Scoped to the select: the "Issued in" filter above it is also options.
      expect(
        within(statusSelect())
          .getAllByRole("option")
          .map((option) => option.textContent),
        sessionStatus,
      ).toEqual(["Pending", "Confirmed", "Cancelled"]);
    }
  });

  it("reads Confirmed for a delivered session, with Delivered beneath", () => {
    // Completed has no option of its own — V7 shows it as Confirmed rather than
    // a value the select cannot represent — so this is the same bug's other
    // route in, and the note underneath is what carries the real state.
    show({ status: "Received", sessionStatus: "Completed" });
    expect(statusSelect().value).toBe("Confirmed");
    // "Delivered" also renders in the Next step cell, so this counts rather
    // than expecting one — the point is the select does not swallow the state.
    expect(screen.getAllByText(/^Delivered$/).length).toBeGreaterThan(0);
  });

  it("still reads Cancelled on a cancelled session", () => {
    show({ sessionStatus: "Cancelled" });
    expect(statusSelect().value).toBe("Cancelled");
  });

  /**
   * The live path, and the one the fresh-render tests above cannot reach.
   *
   * Confirming happens in the Next step column beside this one. The action
   * revalidates, so the row arrives again as new props — but the table keeps
   * the row mounted, so a value read once at mount is never read again. The
   * cell went on saying "Pending" for the rest of the visit while the column
   * next to it had already moved on to the photo guide: two halves of one row
   * disagreeing, the wrong half looking authoritative.
   */
  describe("when the answer arrives as new props", () => {
    const panel = (only: Partial<ConsentRow>) => (
      <ConsentPanel rows={[row(only)]} role="global_admin" confirmable={[]} />
    );

    it("follows the server from Pending to Confirmed without remounting", () => {
      const { rerender } = render(panel({ status: "Received", requestSentAt: SENT }));
      expect(statusSelect().value).toBe("Pending");

      rerender(panel({ status: "Received", requestSentAt: SENT, sessionStatus: "Confirmed" }));
      expect(statusSelect().value).toBe("Confirmed");
    });

    it("agrees with the Next step column after the same change", () => {
      // The two cells read the same row. Confirming moves Next step on to the
      // photo guide, and the status cell claiming Pending underneath it is the
      // contradiction an admin actually sees.
      const { rerender } = render(panel({ status: "Received", requestSentAt: SENT }));
      rerender(panel({ status: "Received", requestSentAt: SENT, sessionStatus: "Confirmed" }));

      expect(statusSelect().value).toBe("Confirmed");
      expect(screen.getByText(/send the photo guide in part 3/i)).toBeInTheDocument();
    });

    it("leaves the local value alone while the server keeps saying the same thing", async () => {
      // The control moves before the round trip so it feels immediate. A
      // re-render that reports nothing new must not undo that — otherwise any
      // unrelated revalidation would snap the select back mid-Undo-window.
      const user = userEvent.setup();
      const { rerender } = render(panel({ sessionStatus: "Cancelled" }));

      await user.selectOptions(statusSelect(), "Pending");
      expect(statusSelect().value).toBe("Pending");

      rerender(panel({ sessionStatus: "Cancelled" }));
      expect(statusSelect().value).toBe("Pending");
    });
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
    expect(screen.getByRole("link", { name: /Download PDF/i })).toBeInTheDocument();
  });

  it("explains the fallback on hover rather than in the pill", () => {
    // The cell is narrow and the qualifier was longer than the action it
    // labelled. Dropping it outright would lose why this download exists, so it
    // has to still be reachable — asserting the title is what keeps it from
    // being quietly deleted as dead words later.
    show({});
    const title = screen.getByRole("link", { name: /Download PDF/i }).getAttribute("title");
    expect(title).toContain("fallback, for sending offline");
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

  /** A second session to switch to, so nothing can carry across. */
  const other: ConfirmableSession = {
    ...confirmable,
    id: "a2",
    sessionReference: "IQC-S0002",
    confirmationReference: "IQC-CONF-0002",
    practitioner: "Arjun Nair",
  };

  const openForm = async () => {
    const user = userEvent.setup();
    render(<ConsentPanel rows={[]} role="global_admin" confirmable={[confirmable, other]} />);
    await user.selectOptions(screen.getByLabelText("Select confirmed session"), "a1");
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

  it("forgets what was typed when a different session is chosen", async () => {
    // Otherwise the second confirmation of the day opens holding the first
    // one's date and time, which read as this session's because nothing on
    // screen says they are not. Same defect as the invented 10:00 AM, one
    // session further along.
    const user = await openForm();
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("Hour"), "02");
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("AM or PM"), "PM");
    await user.type(screen.getByLabelText(/session date/i), "2026-09-01");

    await user.selectOptions(screen.getByLabelText("Select confirmed session"), "a2");
    expect(screen.getByLabelText<HTMLSelectElement>("Hour").value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("AM or PM").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>(/session date/i).value).toBe("");
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

/**
 * The same email offered from both halves of the panel.
 *
 * Once a confirmation is generated, Part 1 keeps its "Send consent request" in
 * local state while the revalidation moves that assignment into Part 2's table
 * — so for the rest of the admin's visit both halves offer the identical send
 * for the identical practitioner, one above the other.
 *
 * `useDeferredSend.test.ts` proves the shared key holds and releases. This
 * proves the two buttons an admin actually sees carry the same key, which is
 * the half that would silently not be true if either side ever keyed off the
 * session rather than the assignment.
 */
describe("one email, two buttons", () => {
  const confirmable: ConfirmableSession = {
    id: "a1",
    sessionReference: "IQC-S0001",
    confirmationReference: "IQC-CONF-0001",
    practitioner: "Priya Sharma",
    agreementReference: "IQC-AGR-0001",
    module: "Equity Investing Simplified",
    sessionDate: "2026-09-01",
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

  const sends = () => screen.getAllByRole("button", { name: "Send consent request" });

  it("disables the twin while one send is counting down", async () => {
    const user = userEvent.setup();
    // The same assignment in both halves: Part 1 from local state after
    // generating, Part 2 from the row the revalidation brought in.
    render(
      <ConsentPanel rows={[row({ id: "a1" })]} role="global_admin" confirmable={[confirmable]} />,
    );

    await user.selectOptions(screen.getByLabelText("Select confirmed session"), "a1");
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("Hour"), "02");
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("Minute"), "30");
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>("AM or PM"), "PM");
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>(/duration/i), "3");
    await user.click(screen.getByRole("button", { name: /generate confirmation/i }));

    // Both halves offer it now, and both are live.
    expect(sends()).toHaveLength(2);
    for (const button of sends()) expect(button).toBeEnabled();

    await user.click(sends()[0]);
    await user.click(await screen.findByRole("button", { name: /click to send/i }));

    // The clicked one is held by its own window, the other by the shared key.
    for (const button of sends()) expect(button).toBeDisabled();
  });
});

/**
 * Part 3 — Send Photo Guide, restored to match V7.
 *
 * It offers the sessions Part 2 shows as Confirmed, and it is the only place
 * either photo-guide control lives. The two facts are related: while the send
 * also sat on every confirmed row, the same email had two buttons — the shape
 * that produced the duplicate-send work above.
 */
describe("Part 3 — Send Photo Guide", () => {
  const picker = () => screen.getByLabelText<HTMLSelectElement>(/select confirmed session to send/i);

  const withRows = (...only: Partial<ConsentRow>[]) =>
    render(
      <ConsentPanel rows={only.map(row)} role="global_admin" confirmable={[]} />,
    );

  it("lists only the sessions Part 2 shows as Confirmed", () => {
    withRows(
      { id: "a1", session: "IQC-S0001", sessionStatus: "Confirmed", status: "Received" },
      { id: "a2", session: "IQC-S0002", sessionStatus: "Pending" },
      { id: "a3", session: "IQC-S0003", sessionStatus: "Cancelled" },
    );

    const offered = within(picker())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(offered).toHaveLength(2); // the placeholder, and the one confirmed session
    expect(offered[1]).toContain("IQC-S0001");
  });

  it("says so rather than showing an empty picker when nothing is confirmed", () => {
    withRows({ sessionStatus: "Pending" });
    expect(screen.getByText(/a session appears here once its status reads Confirmed/i)).toBeInTheDocument();
  });

  it("shows V7's four fields for the session picked", async () => {
    const user = userEvent.setup();
    withRows({ id: "a1", sessionStatus: "Confirmed", status: "Received" });

    await user.selectOptions(picker(), "a1");
    // Scoped to Part 3: the practitioner and the date are in the Part 2 table
    // above as well, so an unscoped query would pass on the wrong element.
    const part3 = within(screen.getByRole("heading", { name: /Part 3/i }).closest("section")!);
    for (const label of ["Practitioner", "Module", "Session date", "Venue"]) {
      expect(part3.getByText(label), label).toBeInTheDocument();
    }
    for (const value of [
      "Priya Sharma",
      "Equity Investing Simplified",
      "20 Aug 2026",
      "Kotak Securities, BKC",
    ]) {
      expect(part3.getByText(value), value).toBeInTheDocument();
    }
  });

  it("keeps both controls here and nowhere else", async () => {
    // The whole point of restoring the part. Two buttons for one email is what
    // sent a practitioner the same message twice.
    const user = userEvent.setup();
    withRows({ id: "a1", sessionStatus: "Confirmed", status: "Received" });

    expect(screen.queryByRole("button", { name: "Send photo guide email" })).not.toBeInTheDocument();
    await user.selectOptions(picker(), "a1");

    expect(screen.getAllByRole("button", { name: "Send photo guide email" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Download photo guide/i })).toHaveLength(1);
  });

  it("warns before sending a guide that has already gone", async () => {
    // V7 has no such note, but it has no Resend either — this control does not
    // change appearance once used, so nothing else says it has been used.
    const user = userEvent.setup();
    withRows({ id: "a1", sessionStatus: "Confirmed", status: "Received", guideSentAt: SENT });

    await user.selectOptions(picker(), "a1");
    expect(screen.getByText(/already sent once/i)).toBeInTheDocument();
  });
});
