import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PayoutsPanel } from "./PayoutsPanel";
import type { PayoutRow } from "@/services/console";

/**
 * Every row in this table is its own record, and the editable cells hold local
 * state. That combination is where a table quietly starts showing one row's
 * data on another: the cell components seed from props on mount, so if React
 * reuses an instance across rows — after a re-sort, or a revalidate that
 * reorders — the typed value follows the position instead of the record.
 *
 * These pin the independence rather than the implementation: type into one row
 * and every other row must be untouched, and each control must act on its own
 * id.
 */

type ActionResult = { ok: true } | { ok: false; message: string };

const setInvoiceReference = vi.fn(async (): Promise<ActionResult> => ({ ok: true }));
const setPayoutStatus = vi.fn(async (): Promise<ActionResult> => ({ ok: true }));

vi.mock("../actions", () => ({
  setInvoiceReference: (...args: unknown[]) => setInvoiceReference(...(args as [])),
  setPayoutStatus: (...args: unknown[]) => setPayoutStatus(...(args as [])),
}));

const row = (overrides: Partial<PayoutRow>): PayoutRow => ({
  id: "assignment-1",
  reference: "IQC-CONF-0001",
  practitioner: "Priya Sharma",
  session: "IQC-S0001",
  sessionDate: "14 Aug 2026",
  grossPayout: "₹12,000",
  grossAmount: 12000,
  invoiceReference: null,
  paidOn: null,
  status: "Pending",
  ...overrides,
});

const ROWS: PayoutRow[] = [
  row({ id: "a1", session: "IQC-S0001", invoiceReference: "IQC-INV-0001", grossAmount: 12000 }),
  row({ id: "a2", session: "IQC-S0002", practitioner: "Vikram Kulkarni", grossAmount: 7500 }),
  row({
    id: "a3",
    session: "IQC-S0003",
    practitioner: "Anita Menon",
    grossAmount: 5000,
    status: "Paid",
    paidOn: "20 Aug 2026",
  }),
];

const invoiceFields = () => screen.getAllByLabelText(/^Invoice reference for/i) as HTMLInputElement[];

describe("PayoutsPanel — every row is its own record", () => {
  it("seeds each invoice field from its own row", () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const fields = invoiceFields();
    expect(fields).toHaveLength(3);
    expect(fields[0]).toHaveValue("IQC-INV-0001");
    expect(fields[1]).toHaveValue("");
    expect(fields[2]).toHaveValue("");
  });

  it("does not leak a typed invoice reference into another row", async () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const fields = invoiceFields();

    await userEvent.type(fields[1], "IQC-INV-9999");

    expect(fields[1]).toHaveValue("IQC-INV-9999");
    expect(fields[0]).toHaveValue("IQC-INV-0001");
    expect(fields[2]).toHaveValue("");
  });

  it("saves against the row that was edited, not the first one", async () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const fields = invoiceFields();

    await userEvent.type(fields[1], "IQC-INV-9999");
    await userEvent.tab();

    expect(setInvoiceReference).toHaveBeenCalledWith("a2", "IQC-INV-9999");
  });

  it("gives each row its own payment-status control, set from its own record", () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const selects = screen.getAllByLabelText(/^Payment status for/i) as HTMLSelectElement[];
    expect(selects.map((select) => select.value)).toEqual(["Pending", "Pending", "Paid"]);
  });

  it("marks the row that was changed", async () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const selects = screen.getAllByLabelText(/^Payment status for/i);

    await userEvent.selectOptions(selects[1], "Paid");

    expect(setPayoutStatus).toHaveBeenCalledWith("a2", "Paid");
  });
});

/**
 * The status control set its own state optimistically and threw the result
 * away, so a refusal left the row reading "Paid" while nothing had been
 * recorded — the one outcome worse than the refusal itself, because the finance
 * view then disagrees with the database and nobody is told.
 */
describe("PayoutsPanel — a refused payout must not look paid", () => {
  it("puts the control back and says why when the server refuses", async () => {
    setPayoutStatus.mockResolvedValueOnce({
      ok: false,
      message: "Add an invoice ref. before marking this payout paid.",
    });
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const selects = screen.getAllByLabelText(/^Payment status for/i) as HTMLSelectElement[];

    await userEvent.selectOptions(selects[1], "Paid");

    expect(await screen.findByRole("alert")).toHaveTextContent(/invoice ref/i);
    expect(selects[1]).toHaveValue("Pending");
  });

  it("leaves the row paid when the server accepts", async () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    const selects = screen.getAllByLabelText(/^Payment status for/i) as HTMLSelectElement[];

    await userEvent.selectOptions(selects[1], "Paid");

    expect(selects[1]).toHaveValue("Paid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("PayoutsPanel — the finance totals", () => {
  it("counts and sums only what is unpaid", () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    // a1 + a2 are pending (12,000 + 7,500); a3 is paid and must not be counted.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("₹19,500")).toBeInTheDocument();
  });

  it("carries the settled date inside the paid pill", () => {
    render(<PayoutsPanel rows={ROWS} role="global_admin" />);
    expect(screen.getByText("Paid — 20 Aug 2026")).toBeInTheDocument();
  });
});

describe("PayoutsPanel — role gating", () => {
  it("gives a view-only user no editable cells", () => {
    render(<PayoutsPanel rows={ROWS} role="user" />);
    expect(screen.queryByLabelText(/^Invoice reference for/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Payment status for/i)).not.toBeInTheDocument();
    // The figures are still readable — "view & download only" is still a view.
    expect(screen.getByText("₹19,500")).toBeInTheDocument();
  });
});
