import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RequestDetail } from "./RequestDetail";
import type { AssignablePractitioner, SessionRequestRow } from "@/services/console";

/**
 * Matching is done by state, so the assign dropdown offers the practitioners
 * who can actually travel to the session and nobody else (client, 2026-08-19
 * — was city until now).
 *
 * The negative assertion is the one that matters. An offer that should not be
 * there is invisible in a list that otherwise looks right, and the cost of
 * taking it is a practitioner booked for a session hours from where they live
 * — found out on the day, by the people in the room.
 */

vi.mock("../actions", () => ({
  updateSessionRequestTerms: vi.fn(async () => ({ ok: true })),
  setSessionRequestStatus: vi.fn(async () => ({ ok: true })),
  deleteSessionRequest: vi.fn(async () => ({ ok: true })),
  sendRequestFollowUp: vi.fn(async () => ({ ok: true })),
  composeDraft: vi.fn(async () => ({ to: "a@b.com", subject: "s", body: "b" })),
}));

const request = (overrides: Partial<SessionRequestRow> = {}): SessionRequestRow => ({
  id: "req-1",
  name: "Rohan Mehta",
  organisation: "Kotak",
  email: "rohan@example.com",
  phone: "+91 98765 43210",
  topic: "Equity Investing Simplified",
  audience: "corporate",
  city: "Bengaluru",
  state: "Karnataka",
  groupSize: "16-25",
  minCommitment: 16,
  preferredDates: "July",
  venue: "Office",
  notes: null,
  receivedOn: "16 Aug 2026",
  status: "New",
  assignedPractitionerId: null,
  assignedTo: null,
  agreedPayout: null,
  sessionReference: null,
  ...overrides,
});

const practitioner = (
  name: string,
  city: string,
  state: string | null,
  id = name.toLowerCase(),
): AssignablePractitioner => ({ id, name, city, state, averageRating: null });

const show = (row: SessionRequestRow, practitioners: AssignablePractitioner[]) =>
  render(<RequestDetail row={row} role="global_admin" practitioners={practitioners} />);

/** The assign dropdown, by the label it is wired to. */
const assignees = () =>
  within(screen.getByLabelText(/Practitioner who agreed/))
    .getAllByRole("option")
    .map((option) => option.textContent);

describe("matching a request offers only its own state", () => {
  it("offers a practitioner based in the request's state", () => {
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Bengaluru", "Karnataka")]);

    expect(assignees().join(" ")).toContain("Sai Kumar");
  });

  it("offers one from a different city, same state", () => {
    // The whole point of matching by state rather than city: someone in
    // Mysuru can still take a request from Bengaluru, both Karnataka.
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Mysuru", "Karnataka")]);

    expect(assignees().join(" ")).toContain("Sai Kumar");
  });

  it("withholds one based anywhere else", () => {
    show(request({ state: "Karnataka" }), [
      practitioner("Sai Kumar", "Bengaluru", "Karnataka"),
      practitioner("Tarun Rao", "Mumbai", "Maharashtra"),
      practitioner("Vikram Varma", "Delhi", "Delhi"),
    ]);

    const offered = assignees().join(" ");
    expect(offered).toContain("Sai Kumar");
    expect(offered).not.toContain("Tarun Rao");
    expect(offered).not.toContain("Vikram Varma");
  });

  it("reads two spellings of one state as one place", () => {
    // Practitioner states were free text until the picker landed and still
    // hold whatever was typed, so case and stray padding cannot be allowed to
    // hide somebody who is in fact local.
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Bengaluru", "  karnataka ")]);

    expect(assignees().join(" ")).toContain("Sai Kumar");
  });

  it("does not treat two different states as the same place", () => {
    // Deliberate: no alias table. Guessing which two names mean one state is
    // how somebody gets matched to a session hours away, and the empty state
    // below says plainly that nobody is available.
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Chennai", "Tamil Nadu")]);

    expect(assignees().join(" ")).not.toContain("Sai Kumar");
  });

  it("says why the list is empty rather than showing an empty one", () => {
    // A dropdown holding only its placeholder reads as a list that failed to
    // load, and an admin would go hunting for the fault.
    show(request({ state: "Kerala" }), [practitioner("Sai Kumar", "Bengaluru", "Karnataka")]);

    expect(screen.getByText(/No empanelled practitioner is based in Kerala/)).toBeInTheDocument();
    // Still only the placeholder, so nothing out of state can be picked by accident.
    expect(assignees()).toHaveLength(1);
  });

  it("names the state it is filtering by, so an empty list is explicable", () => {
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Bengaluru", "Karnataka")]);

    expect(screen.getByText(/based in Karnataka/)).toBeInTheDocument();
  });
});

/**
 * Falls back to city when either side has no state recorded — `state` on a
 * practitioner is null for any record older than migration 0017, and an
 * equally old request carries the same gap. Neither can be compared to a
 * state it doesn't have.
 */
describe("falls back to city when state is missing", () => {
  it("matches by city when the request has no state", () => {
    show(request({ city: "Bengaluru", state: null }), [
      practitioner("Sai Kumar", "Bengaluru", "Karnataka"),
      practitioner("Tarun Rao", "Mumbai", "Maharashtra"),
    ]);

    const offered = assignees().join(" ");
    expect(offered).toContain("Sai Kumar");
    expect(offered).not.toContain("Tarun Rao");
  });

  it("does not match a practitioner with no state to a request with a state", () => {
    // The request has something to compare against; a practitioner with no
    // state recorded is not a state match, and the fallback only runs when
    // the REQUEST has nothing to match on, not when a practitioner does.
    show(request({ state: "Karnataka" }), [practitioner("Sai Kumar", "Bengaluru", null)]);

    expect(assignees().join(" ")).not.toContain("Sai Kumar");
  });

  it("names the city, not a blank state, when the request has no state", () => {
    show(request({ city: "Kochi", state: null }), []);

    // Scoped to the label: the empty-list message below it says "based in
    // Kochi" too, so an unscoped query matches both.
    expect(screen.getByLabelText(/Practitioner who agreed/).closest("div")).toHaveTextContent(
      /based in Kochi/,
    );
  });
});

/**
 * "Send cancellation message" removed from the request screen entirely
 * (client, 2026-08-18) — cancelling is now Session Consent Part 2's job, once
 * a session actually exists to cancel. Its hint text points there instead of
 * naming a status this card no longer offers a cancel button for.
 */
describe("cancellation is not offered from this screen", () => {
  it("has no send-cancellation control", () => {
    show(request({}), []);
    expect(screen.queryByRole("button", { name: /cancellation/i })).not.toBeInTheDocument();
  });

  it("points the status hint at Session Consent instead of describing a cancel action here", () => {
    show(request({}), []);
    expect(screen.getByText(/Cancellations are handled from Session Consent, Part 2/)).toBeInTheDocument();
    expect(screen.queryByText(/falls through/)).not.toBeInTheDocument();
  });
});
