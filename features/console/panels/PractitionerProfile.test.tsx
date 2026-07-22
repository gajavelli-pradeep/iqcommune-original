import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PractitionerProfile } from "./PractitionerProfile";
import type { PractitionerRow } from "@/services/console";

/**
 * The detail card's central rule is which stages an admin may set by hand.
 *
 * V7 shows a status `<select>` on 'Applied', 'Screening Done' and 'Rejected'
 * and a read-only box everywhere else, because the remaining stages are set by
 * the system when the agreement link goes out and when the signature returns.
 * That conditional is easy to "tidy" into an always-present dropdown, which
 * would let an admin put the pipeline out of step with the agreement record —
 * so it is pinned here rather than left to a screenshot.
 */

// The card imports server actions; the module is stubbed so the component can
// render in isolation. What is under test is which controls appear, not what
// they call — the actions re-check the capability server-side regardless.
vi.mock("../actions", () => ({
  deactivatePractitioner: vi.fn(),
  deleteApplication: vi.fn(),
  empanelPractitioner: vi.fn(),
  generateAndSendAgreement: vi.fn(),
  overridePractitionerField: vi.fn(),
  reactivatePractitioner: vi.fn(),
  rejectApplication: vi.fn(),
  savePractitionerNotes: vi.fn(),
  sendWelcomeMessage: vi.fn(),
  setApplicationStage: vi.fn(),
}));

const BASE: PractitionerRow = {
  id: "app:1",
  applicationId: "1",
  practitionerId: null,
  reference: null,
  name: "Anita Menon",
  role: "Portfolio Manager",
  organisation: null,
  module: "Asset Allocation & Portfolio Construction",
  city: "Bengaluru",
  state: "Karnataka",
  address: "14 Residency Road",
  tshirtSize: "M",
  experience: "13 – 18 years",
  email: "anita@example.com",
  phone: "+91 98200 11111",
  appliedOn: "22 Jul 2026",
  status: "Applied",
  averageRating: null,
  notes: null,
};

const row = (overrides: Partial<PractitionerRow> = {}): PractitionerRow => ({
  ...BASE,
  ...overrides,
});

const stageSelect = () => screen.queryByRole("combobox", { name: /pipeline stage/i });

describe("PractitionerProfile — which stages an admin may set", () => {
  it.each(["Applied", "Screening Done", "Rejected"])(
    "offers the stage dropdown on %s, the admin's judgement call",
    (status) => {
      render(<PractitionerProfile row={row({ status })} role="global_admin" />);
      expect(stageSelect()).toBeInTheDocument();
    },
  );

  it.each(["Agreement Sent", "Empanelled", "Deactivated"])(
    "replaces the dropdown with a read-only state on %s, which the system sets",
    (status) => {
      render(
        <PractitionerProfile
          row={row({ status, practitionerId: "p1", id: "prac:p1" })}
          role="global_admin"
        />,
      );
      expect(stageSelect()).not.toBeInTheDocument();
      expect(screen.getByText(/system-set|set manually/i)).toBeInTheDocument();
    },
  );

  it("offers only the three hand-set stages as options", () => {
    render(<PractitionerProfile row={row()} role="global_admin" />);
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Applied", "Screening Done", "Rejected"]);
  });
});

describe("PractitionerProfile — role gating", () => {
  it("gives a view-only user no pipeline controls at all", () => {
    render(<PractitionerProfile row={row()} role="user" />);
    expect(stageSelect()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate & send/i })).not.toBeInTheDocument();
    expect(screen.getByText(/view-only access/i)).toBeInTheDocument();
  });

  it("withholds the field-correction controls from an admin", () => {
    // `override` is Global Admin only: correcting a recorded value is a
    // different power from progressing a record through its pipeline.
    render(<PractitionerProfile row={row()} role="admin" />);
    expect(stageSelect()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /correct module/i })).not.toBeInTheDocument();
  });

  it("gives the global admin the field-correction controls", () => {
    render(<PractitionerProfile row={row()} role="global_admin" />);
    expect(screen.getByRole("button", { name: /correct module/i })).toBeInTheDocument();
  });
});

describe("PractitionerProfile — actions follow the stage", () => {
  it("offers the agreement send only once screening is done", () => {
    render(<PractitionerProfile row={row({ status: "Applied" })} role="global_admin" />);
    expect(screen.queryByRole("button", { name: /generate & send/i })).not.toBeInTheDocument();

    render(<PractitionerProfile row={row({ status: "Screening Done" })} role="global_admin" />);
    expect(screen.getByRole("button", { name: /generate & send/i })).toBeInTheDocument();
  });

  it("refuses deletion once a practitioner record exists", () => {
    render(
      <PractitionerProfile
        row={row({ status: "Empanelled", practitionerId: "p1", id: "prac:p1" })}
        role="global_admin"
      />,
    );
    expect(screen.queryByRole("button", { name: /delete permanently/i })).not.toBeInTheDocument();
    expect(screen.getByText(/can.t be deleted/i)).toBeInTheDocument();
  });

  it("shows no reference until the agreement assigns one", () => {
    render(<PractitionerProfile row={row()} role="global_admin" />);
    expect(screen.getByText(/assigned when the agreement is generated/i)).toBeInTheDocument();
  });
});
