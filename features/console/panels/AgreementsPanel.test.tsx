import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgreementsPanel } from "./AgreementsPanel";
import type { AgreementRow } from "@/services/console";

/**
 * The Welcome Message column — V7's seventh, between the download and the
 * actions.
 *
 * It is the only place the welcome is offered now, and the only place a row
 * says whether it has gone. Both halves matter: a second button elsewhere is
 * how one practitioner gets the message twice, and a column that always shows
 * the button is one an admin has to remember the answer to.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("../actions", () => ({
  clearSignedAgreement: vi.fn(async () => undefined),
  sendWelcomeMessage: vi.fn(async () => undefined),
  composeDraft: vi.fn(async () => ({ to: "priya@example.com", subject: "Welcome", body: "Hi Priya," })),
  recordWhatsAppOpened: vi.fn(async () => undefined),
}));

const SIGNED = "2026-08-14T10:00:00.000Z";

const row = (overrides: Partial<AgreementRow>): AgreementRow => ({
  id: "agr-1",
  practitionerId: "p-1",
  reference: "IQC-AGR-0041",
  practitioner: "Priya Sharma",
  modules: "Foundations of Personal Finance",
  signedOn: "14 Aug 2026",
  signedAt: "14 Aug 2026, 10:00 am IST",
  method: "Typed",
  status: "Signed",
  welcomeSentAt: null,
  ...overrides,
});

const show = (only: Partial<AgreementRow>) =>
  render(<AgreementsPanel rows={[row(only)]} role="global_admin" />);

/** The cell under the Welcome Message header, found by its column position. */
const welcomeCell = () => {
  const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
  const index = headers.indexOf("Welcome Message");
  expect(index, "Welcome Message column is present").toBeGreaterThan(-1);
  return within(screen.getAllByRole("row")[1].querySelectorAll("td")[index] as HTMLElement);
};

describe("Welcome Message", () => {
  it("sits between the download and the actions, as V7 orders it", () => {
    show({});
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Practitioner",
      "Agreement ref.",
      "Signed on",
      "Method",
      "Status",
      "Download Signed Agreement",
      "Welcome Message",
      "Actions",
    ]);
  });

  it("offers the send while the welcome has not gone", () => {
    show({});
    expect(welcomeCell().getByRole("button", { name: "Send welcome message" })).toBeInTheDocument();
  });

  it("reads Sent once it has, and stops offering it", () => {
    // The half an admin needs on the list itself — otherwise the only way to
    // know is to remember, and a forgotten welcome and a duplicate one look
    // identical from here.
    show({ welcomeSentAt: SIGNED });
    const cell = welcomeCell();
    expect(cell.getByText("Sent")).toBeInTheDocument();
    expect(cell.queryByRole("button", { name: "Send welcome message" })).not.toBeInTheDocument();
  });

  it("withholds it until the agreement is signed", () => {
    // The message says the practitioner is officially empanelled. Pending means
    // they have not signed, so there is nothing to welcome them to yet.
    show({ status: "Pending", signedOn: null, signedAt: null, method: null });
    const cell = welcomeCell();
    expect(cell.queryByRole("button", { name: "Send welcome message" })).not.toBeInTheDocument();
    expect(cell.getByText("—")).toBeInTheDocument();
  });

  it("is withheld entirely from a role that may not send", () => {
    // V7 keeps the header and gates only the button. Every action column in
    // this console gates at the column instead, and one panel breaking that
    // pattern is worse than the deviation.
    cleanup();
    render(<AgreementsPanel rows={[row({})]} role="user" />);
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).not.toContain("Welcome Message");
  });
});
