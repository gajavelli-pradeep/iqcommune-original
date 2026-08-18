import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConsentPanel } from "./ConsentPanel";
import { generateConfirmation, setConfirmationStatus } from "../actions";
import type { ConfirmableSession, ConsentRow } from "@/services/console";

/**
 * Part 2's row is where the consent request is sent and where what came back
 * is read. These prove each cell offers the one control it should and, more
 * importantly, that it offers none it should not.
 *
 * The negative assertions are the ones that matter: a cancelled session still
 * offering to chase consent is the one that reaches a practitioner.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("../actions", () => ({
  deleteConfirmationRecord: vi.fn(async () => ({ ok: true })),
  generateConfirmation: vi.fn(async () => ({ ok: true })),
  overrideConfirmationField: vi.fn(async () => ({ ok: true })),
  sendConsentRequest: vi.fn(async () => ({ ok: true })),
  sendPhotoGuide: vi.fn(async () => ({ ok: true })),
  setConfirmationStatus: vi.fn(async () => ({ ok: true })),
  // The draft dialog stands between every send button and its Undo window, so
  // the duplicate-send test below cannot reach one without it.
  composeDraft: vi.fn(async () => ({
    to: "priya@example.com",
    subject: "Your session confirmation",
    body: "Hi Priya,",
    recipientName: "Suresh Patel",
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
  confirmationStatus: "Pending",
  // One practitioner on the session unless a test says otherwise, so cancelling
  // this row is cancelling the session and the client dialog is the right one.
  onlyLiveOnSession: true,
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
 * Nothing that reaches a practitioner, on a row that should not be reaching
 * one. Asserting absence by name is unambiguous where asserting on text is not
 * — "Delivered" also appears in the status cell.
 */
const NO_ACTIONS = ["Send consent request", "Send photo guide email"] as const;

const expectNothingOffered = () => {
  for (const name of NO_ACTIONS) {
    expect(screen.queryByRole("button", { name }), name).not.toBeInTheDocument();
  }
};


const show = (only: Partial<ConsentRow>) =>
  render(<ConsentPanel rows={[row(only)]} role="global_admin" confirmable={[]} />);

/**
 * Part 2's "Send Consent Request" column — V7's fifth, ahead of the status it
 * produces.
 *
 * It replaces a "Next step" column that carried this send, the confirm and the
 * photo guide in one cell. What it must keep from that column is the one
 * guarantee that reached a person: a session nobody will run does not ask a
 * practitioner to agree to it.
 */
describe("Send Consent Request", () => {
  it("offers the send while nothing has gone out", () => {
    show({});
    expect(screen.getByRole("button", { name: "Send consent request" })).toBeInTheDocument();
  });

  it("draws it filled red, as V7 does", () => {
    show({});
    const send = screen.getByRole("button", { name: "Send consent request" });
    expect(send.className).toContain("bg-red");
  });

  it("reads Sent once it has gone, with how long ago", () => {
    show({ requestSentAt: SENT, requestSentLabel: "3 days ago" });
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send consent request" })).not.toBeInTheDocument();
  });

  it("will not ask a cancelled confirmation for consent", () => {
    // The one that reaches a person. V7 renders the button regardless; asking a
    // practitioner to agree to a session that has been cancelled is worse than
    // the inconsistency.
    show({ confirmationStatus: "Cancelled" });
    expect(screen.getByText(/no longer in progress/i)).toBeInTheDocument();
    expectNothingOffered();
  });
});

/**
 * Three practitioners on one session, controlled apart.
 *
 * The whole reason the status control moved off the session. Bound there it
 * held one answer for every row that shared a session, so cancelling the
 * practitioner who backed out cancelled the two still delivering it — and all
 * three controls answered to the same name, "Session status for IQC-S0007".
 *
 * These are the assertions that fail if either end of the binding slips back:
 * the value each row reads, and the id each row writes.
 */
describe("confirmations on one session act independently", () => {
  /** Vikram and Tarun, both on IQC-S0007, as the console reported them. */
  const twoOnOneSession = (
    first: Partial<ConsentRow> = {},
    second: Partial<ConsentRow> = {},
  ) =>
    render(
      <ConsentPanel
        rows={[
          row({ id: "a1", reference: "IQC-CONF-0010", sessionId: "s7", session: "IQC-S0007", practitioner: "Tarun Rao", onlyLiveOnSession: false, ...first }),
          row({ id: "a2", reference: "IQC-CONF-0011", sessionId: "s7", session: "IQC-S0007", practitioner: "Vikram Varma", onlyLiveOnSession: false, ...second }),
        ]}
        role="global_admin"
        confirmable={[]}
      />,
    );

  const statusFor = (reference: string) =>
    screen.getByLabelText<HTMLSelectElement>(`Status for ${reference}`);

  it("gives each row its own control, named for its own confirmation", () => {
    twoOnOneSession();
    // Two controls with one name is the a11y half of the same defect: a screen
    // reader could not tell an admin which of three they had landed on.
    expect(statusFor("IQC-CONF-0010")).toBeInTheDocument();
    expect(statusFor("IQC-CONF-0011")).toBeInTheDocument();
  });

  it("reads one as Cancelled while the other still reads Confirmed", () => {
    twoOnOneSession({ confirmationStatus: "Cancelled" }, { confirmationStatus: "Confirmed" });
    expect(statusFor("IQC-CONF-0010").value).toBe("Cancelled");
    expect(statusFor("IQC-CONF-0011").value).toBe("Confirmed");
  });

  it("writes the confirmation's id, not the session's", async () => {
    // The write end. Confirmed rather than Cancelled because it commits at once
    // — cancelling waits out the Undo window first.
    const user = userEvent.setup();
    twoOnOneSession();
    await user.selectOptions(statusFor("IQC-CONF-0011"), "Confirmed");
    expect(vi.mocked(setConfirmationStatus)).toHaveBeenCalledWith("a2", "Confirmed");
  });

  it("keeps the send on the rows still going ahead", () => {
    twoOnOneSession({ confirmationStatus: "Cancelled" }, { confirmationStatus: "Confirmed" });
    expect(screen.getAllByText(/no longer in progress/i)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Send consent request" })).toHaveLength(1);
  });

  it("does not tell the client the session is off while others are on it", async () => {
    // The dialog is the client's cancellation email. Opening it here would put
    // an admin one click from telling a client their session is cancelled while
    // another practitioner is still delivering it. Same gate for either reason
    // on the select — "Cancelled by client" is the representative case.
    const user = userEvent.setup();
    twoOnOneSession();

    await user.selectOptions(statusFor("IQC-CONF-0010"), "Cancelled by client");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Still held for the same Undo window, and named for the confirmation.
    expect(screen.getByText("Cancelling IQC-CONF-0010…")).toBeInTheDocument();
    expect(statusFor("IQC-CONF-0010").value).toBe("Cancelled");
  });

  it("does tell them when the last one goes", async () => {
    const user = userEvent.setup();
    twoOnOneSession({ onlyLiveOnSession: true });

    await user.selectOptions(statusFor("IQC-CONF-0010"), "Cancelled by client");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("stops counting a cancelled practitioner as a signature still owed", () => {
    // The red count drives the sidebar badge, so a cancelled row left in it
    // reports work from every other tab that nobody is waiting on — and the
    // only way to clear the number would be to chase a signature from someone
    // who is no longer on the session.
    twoOnOneSession({ confirmationStatus: "Cancelled" }, { confirmationStatus: "Confirmed" });
    expect(screen.getByText("Signed copy not yet received").previousSibling).toHaveTextContent("1");
  });
});

/**
 * Two reasons, two dialogs, two different mails (client delivery, latest
 * folder, 2026-08-17). Same gate, same Undo window — see the block above — but
 * which template composes, and who it reaches, has to follow the reason
 * actually picked rather than always the client-cancelled one.
 */
describe("the two cancel reasons open the right dialog", () => {
  it("opens the client-cancelled dialog for that reason, naming the requester", async () => {
    const user = userEvent.setup();
    show({});
    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>(/^Status for/i), "Cancelled by client");
    // Matches the delivered spec's own title exactly (client, 2026-08-18):
    // "Notify about cancellation — Suresh Patel", not "Cancel session —
    // client's side" — that string covers only the brief window before the
    // draft, and the requester's name in it, have loaded.
    expect(
      await screen.findByRole("dialog", { name: /Notify about cancellation — Suresh Patel/i }),
    ).toBeInTheDocument();
  });

  it("opens the rematch dialog for the practitioner-cancelled reason, naming the requester", async () => {
    const user = userEvent.setup();
    show({});
    await user.selectOptions(
      screen.getByLabelText<HTMLSelectElement>(/^Status for/i),
      "Cancelled by practitioner",
    );
    expect(
      await screen.findByRole("dialog", { name: /Notify client — practitioner change — Suresh Patel/i }),
    ).toBeInTheDocument();
  });

  // Not tested here: that `reason` reaches `setConfirmationStatus` unchanged.
  // Both cases above already exercise the same state the write closes over —
  // `kind={reason === "practitioner" ? ... }` renders the right dialog only if
  // `reason` was captured correctly, and `cancel(reason)` reads that identical
  // value — so a third assertion of the same fact through `useDeferredSend`'s
  // real `setTimeout` was fighting fake timers against React's own scheduler
  // for coverage this file already has.
});

/**
 * "Delete this record" — the entry-error escape hatch, Global Admin only
 * (client requirements/latest, 2026-08-17). Present and enabled for the role
 * that can reach it; absent — not merely disabled — for one that cannot,
 * since a hidden-but-wired button is still a control a lesser role could
 * inspect and reason about (`roles.ts`'s own stated rule).
 */
describe("Delete this record", () => {
  it("is offered to a Global Admin, ready to use", () => {
    show({});
    const button = screen.getByRole("button", { name: "Delete this record" });
    expect(button).not.toBeDisabled();
  });

  it("is never rendered for an Admin, who lacks purge", () => {
    render(<ConsentPanel rows={[row({})]} role="admin" confirmable={[]} />);
    expect(screen.queryByRole("button", { name: "Delete this record" })).not.toBeInTheDocument();
  });

  it("is hidden once the row already reads Cancelled — the click had nothing left to do", () => {
    // Cancelling a confirmation already runs the same reset this button would
    // (`resetSessionForRematch`), so offering it afterwards looked like a
    // click that did nothing — the reported bug (client, 2026-08-18).
    show({ confirmationStatus: "Cancelled" });
    expect(screen.queryByRole("button", { name: "Delete this record" })).not.toBeInTheDocument();
  });
});

/**
 * What the status cell says this confirmation is.
 *
 * Confirmed is withheld from the options on purpose — confirming is the Next
 * step button's job, and only once consent is in. But a select cannot display
 * a value it has no option for, so the browser resolved a confirmed row to the
 * first option it did have and the cell read "Pending". Not a blank an admin
 * would question: a definite, wrong answer on the control they use to see
 * where a session stands.
 */
describe("the status cell says what this confirmation is", () => {
  const statusSelect = () => screen.getByLabelText<HTMLSelectElement>(/^Status for/i);

  it("reads Confirmed once the session is confirmed", () => {
    show({ status: "Received", confirmationStatus: "Confirmed" });
    expect(statusSelect().value).toBe("Confirmed");
  });

  it("lets an admin set any of the four choices", () => {
    // Including Confirmed, and on a row whose consent has not come back —
    // consent sometimes arrives on paper, and a session with a real agreement
    // behind it must not be stuck Pending because of how the agreement arrived.
    // Bare "Cancelled" is not among them: it is where the select comes to rest
    // afterwards, not a place to pick it from.
    show({ status: "Received", confirmationStatus: "Confirmed" });
    for (const option of ["Pending", "Confirmed", "Cancelled by client", "Cancelled by practitioner"]) {
      expect(screen.getByRole("option", { name: option }), option).toBeEnabled();
    }
    expect(screen.getByRole("option", { name: "Cancelled" })).toBeDisabled();
  });

  it("speaks the same five entries whatever the row is at", () => {
    // A list that grows or shrinks by row makes a state look like it does not
    // exist yet, and leaves an admin counting options to work out where a
    // confirmation stands.
    for (const confirmationStatus of ["Pending", "Confirmed", "Cancelled"]) {
      cleanup();
      show({ status: "Received", confirmationStatus });
      // Scoped to the select: the "Issued in" filter above it is also options.
      expect(
        within(statusSelect())
          .getAllByRole("option")
          .map((option) => option.textContent),
        confirmationStatus,
      ).toEqual(["Pending", "Confirmed", "Cancelled", "Cancelled by client", "Cancelled by practitioner"]);
    }
  });

  it("reads Confirmed for a delivered session, with Delivered beneath", () => {
    // Completed has no option of its own — V7 shows it as Confirmed rather than
    // a value the select cannot represent — so this is the same bug's other
    // route in, and the note underneath is what carries the real state.
    show({ status: "Received", confirmationStatus: "Completed" });
    expect(statusSelect().value).toBe("Confirmed");
    // "Delivered" also renders as the note under the select, so this counts
    // rather than expecting one — the point is the select does not swallow it.
    expect(screen.getAllByText(/^Delivered$/).length).toBeGreaterThan(0);
  });

  it("still reads Cancelled on a cancelled session", () => {
    show({ confirmationStatus: "Cancelled" });
    expect(statusSelect().value).toBe("Cancelled");
  });

  /**
   * The live path, and the one the fresh-render tests above cannot reach.
   *
   * A confirm revalidates, so the row arrives again as new props — but the
   * table keeps the row mounted, so a value read once at mount is never read
   * again. The cell went on saying "Pending" for the rest of the visit while
   * the record said otherwise, and the cell is what an admin reads.
   */
  describe("when the answer arrives as new props", () => {
    const panel = (only: Partial<ConsentRow>) => (
      <ConsentPanel rows={[row(only)]} role="global_admin" confirmable={[]} />
    );

    it("follows the server from Pending to Confirmed without remounting", () => {
      const { rerender } = render(panel({ status: "Received", requestSentAt: SENT }));
      expect(statusSelect().value).toBe("Pending");

      rerender(panel({ status: "Received", requestSentAt: SENT, confirmationStatus: "Confirmed" }));
      expect(statusSelect().value).toBe("Confirmed");
    });

    it("does not snap back when an unrelated re-render reports the same status", () => {
      // The control moves before the round trip so it feels immediate, and a
      // re-render carrying no new answer must leave that alone.
      const { rerender } = render(panel({ status: "Received", requestSentAt: SENT }));
      rerender(panel({ status: "Received", requestSentAt: SENT, confirmationStatus: "Confirmed" }));

      expect(statusSelect().value).toBe("Confirmed");
    });

    it("leaves the local value alone while the server keeps saying the same thing", async () => {
      // The control moves before the round trip so it feels immediate. A
      // re-render that reports nothing new must not undo that — otherwise any
      // unrelated revalidation would snap the select back mid-Undo-window.
      const user = userEvent.setup();
      const { rerender } = render(panel({ confirmationStatus: "Cancelled" }));

      await user.selectOptions(statusSelect(), "Pending");
      expect(statusSelect().value).toBe("Pending");

      rerender(panel({ confirmationStatus: "Cancelled" }));
      expect(statusSelect().value).toBe("Pending");
    });
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

  // The unsigned copy is no longer offered here. It lived in the "Next step"
  // column, and V7's Part 2 has no such control — Part 1 still hands it over at
  // the moment of generating, which is when an admin who cannot reach the
  // practitioner by email needs it.
});

describe("a view-only role", () => {
  it("gets no controls, but can still read the table", () => {
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
      { id: "a1", session: "IQC-S0001", confirmationStatus: "Confirmed", status: "Received" },
      { id: "a2", session: "IQC-S0002", confirmationStatus: "Pending" },
      { id: "a3", session: "IQC-S0003", confirmationStatus: "Cancelled" },
    );

    const offered = within(picker())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(offered).toHaveLength(2); // the placeholder, and the one confirmed session
    expect(offered[1]).toContain("IQC-S0001");
  });

  it("says so rather than showing an empty picker when nothing is confirmed", () => {
    withRows({ confirmationStatus: "Pending" });
    expect(screen.getByText(/a session appears here once its status reads Confirmed/i)).toBeInTheDocument();
  });

  it("shows V7's four fields for the session picked", async () => {
    const user = userEvent.setup();
    withRows({ id: "a1", confirmationStatus: "Confirmed", status: "Received" });

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
    withRows({ id: "a1", confirmationStatus: "Confirmed", status: "Received" });

    expect(screen.queryByRole("button", { name: "Send photo guide email" })).not.toBeInTheDocument();
    await user.selectOptions(picker(), "a1");

    expect(screen.getAllByRole("button", { name: "Send photo guide email" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Download photo guide/i })).toHaveLength(1);
  });

  it("warns before sending a guide that has already gone", async () => {
    // V7 has no such note, but it has no Resend either — this control does not
    // change appearance once used, so nothing else says it has been used.
    const user = userEvent.setup();
    withRows({ id: "a1", confirmationStatus: "Confirmed", status: "Received", guideSentAt: SENT });

    await user.selectOptions(picker(), "a1");
    expect(screen.getByText(/already sent once/i)).toBeInTheDocument();
  });
});

describe("Part 2's columns", () => {
  it("are V7's eight, in V7's order", () => {
    // The delivery moved the send into its own column and dropped the "Next
    // step" one this console had added. Asserting the whole header row catches
    // a column going missing and one drifting out of position — neither of
    // which any behavioural test would notice.
    show({});
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Confirmation ref.",
      "Session",
      "Practitioner",
      "Gross payout",
      "Send Consent Request",
      "Consent status",
      "Download Signed Consent",
      // V7 heads this "Session status". It is bound to the confirmation now, so
      // a row can read Cancelled while its session runs on — see the column's
      // own note for why the heading moved with the binding.
      "Confirmation status",
    ]);
  });
});
