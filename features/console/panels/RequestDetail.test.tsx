import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RequestDetail } from "./RequestDetail";
import type { AssignablePractitioner, SessionRequestRow } from "@/services/console";

/**
 * Matching is done by city, so the assign dropdown offers the practitioners who
 * can actually travel to the session and nobody else (client, 2026-08-17).
 *
 * The negative assertion is the one that matters. An offer that should not be
 * there is invisible in a list that otherwise looks right, and the cost of
 * taking it is a practitioner booked for a session in another state — found out
 * on the day, by the people in the room.
 */

vi.mock("../actions", () => ({
  updateSessionRequestTerms: vi.fn(async () => ({ ok: true })),
  setSessionRequestStatus: vi.fn(async () => ({ ok: true })),
  deleteSessionRequest: vi.fn(async () => ({ ok: true })),
  sendRequestFollowUp: vi.fn(async () => ({ ok: true })),
  sendRequestCancellation: vi.fn(async () => ({ ok: true })),
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
  id = name.toLowerCase(),
): AssignablePractitioner => ({ id, name, city, averageRating: null });

const show = (row: SessionRequestRow, practitioners: AssignablePractitioner[]) =>
  render(<RequestDetail row={row} role="global_admin" practitioners={practitioners} />);

/** The assign dropdown, by the label it is wired to. */
const assignees = () =>
  within(screen.getByLabelText(/Practitioner who agreed/))
    .getAllByRole("option")
    .map((option) => option.textContent);

describe("matching a request offers only its own city", () => {
  it("offers a practitioner based in the request's city", () => {
    show(request({ city: "Bengaluru" }), [practitioner("Sai Kumar", "Bengaluru")]);

    expect(assignees().join(" ")).toContain("Sai Kumar");
  });

  it("withholds one based anywhere else", () => {
    show(request({ city: "Bengaluru" }), [
      practitioner("Sai Kumar", "Bengaluru"),
      practitioner("Tarun Rao", "Mumbai"),
      practitioner("Vikram Varma", "Delhi"),
    ]);

    const offered = assignees().join(" ");
    expect(offered).toContain("Sai Kumar");
    expect(offered).not.toContain("Tarun Rao");
    expect(offered).not.toContain("Vikram Varma");
  });

  it("reads two spellings of one city as one place", () => {
    // Practitioner cities were free text until the picker landed and still hold
    // whatever was typed, so case and stray padding cannot be allowed to hide
    // somebody who is in fact local.
    show(request({ city: "Bengaluru" }), [practitioner("Sai Kumar", "  bengaluru ")]);

    expect(assignees().join(" ")).toContain("Sai Kumar");
  });

  it("does not treat Bangalore and Bengaluru as the same place", () => {
    // Deliberate: no alias table. Guessing which two names mean one city is how
    // somebody gets matched to a session a flight away, and the empty state
    // below says plainly that nobody is available.
    show(request({ city: "Bengaluru" }), [practitioner("Sai Kumar", "Bangalore")]);

    expect(assignees().join(" ")).not.toContain("Sai Kumar");
  });

  it("says why the list is empty rather than showing an empty one", () => {
    // A dropdown holding only its placeholder reads as a list that failed to
    // load, and an admin would go hunting for the fault.
    show(request({ city: "Kochi" }), [practitioner("Sai Kumar", "Bengaluru")]);

    expect(screen.getByText(/No empanelled practitioner is based in Kochi/)).toBeInTheDocument();
    // Still only the placeholder, so nothing out of town can be picked by accident.
    expect(assignees()).toHaveLength(1);
  });

  it("names the city it is filtering by, so an empty list is explicable", () => {
    show(request({ city: "Bengaluru" }), [practitioner("Sai Kumar", "Bengaluru")]);

    expect(screen.getByText(/based in Bengaluru/)).toBeInTheDocument();
  });
});
