"use client";

import { useState, useTransition } from "react";

import { controlClass } from "@/components/ui/control";

import { setInvoiceReference, setPayoutStatus } from "../actions";
import { ConsoleTable, PersonCell, type ColumnDef } from "../ConsoleTable";
import { PeriodFilter, matchesPeriod, yearsIn } from "../PeriodFilter";
import { PAYOUT_STATUS, StatusPill } from "../StatusPill";
import { can, type ConsoleRole } from "../roles";
import type { PayoutRow } from "@/services/console";

/**
 * Payouts — money out.
 *
 * The platform does not move money; it records that someone did. So both
 * controls here are assertions about the outside world: the finance team's
 * invoice reference, and whether the transfer has happened. Marking Paid stamps
 * today, because an admin ticking it is saying it happened now.
 */

const FIELD = controlClass({ tone: "inline" });

/** The invoice reference cell — saved on blur, not on every keystroke. */
function InvoiceReference({ row }: { row: PayoutRow }) {
  const [value, setValue] = useState(row.invoiceReference ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <label className="sr-only" htmlFor={`${row.id}-invoice`}>
        Invoice reference for {row.session}
      </label>
      <input
        id={`${row.id}-invoice`}
        value={value}
        disabled={pending}
        placeholder="e.g. IQC-INV-0026"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value.trim() === (row.invoiceReference ?? "")) return;
          start(async () => {
            const result = await setInvoiceReference(row.id, value);
            if (result.ok) {
              setError(null);
            } else {
              setError(result.message);
              setValue(row.invoiceReference ?? "");
            }
          });
        }}
        className={`${FIELD} w-[130px] font-mono`}
      />
      {error ? (
        <p role="alert" className="mt-1 max-w-[130px] text-3xs text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The Pending/Paid control. V7 keeps it separate from the status pill. */
function PayoutStatus({ row }: { row: PayoutRow }) {
  const [status, setStatus] = useState(row.status);
  const [pending, start] = useTransition();

  return (
    <>
      <label className="sr-only" htmlFor={`${row.id}-payout-status`}>
        Payment status for {row.session}
      </label>
      <select
        id={`${row.id}-payout-status`}
        value={status}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as PayoutRow["status"];
          setStatus(next);
          start(async () => {
            await setPayoutStatus(row.id, next);
          });
        }}
        className={`${FIELD} cursor-pointer`}
      >
        <option value="Pending">Pending</option>
        <option value="Paid">Paid</option>
      </select>
    </>
  );
}

function columns(role: ConsoleRole): ReadonlyArray<ColumnDef<PayoutRow>> {
  const mayEdit = can(role, "mutate");

  return [
    {
      key: "practitioner",
      header: "Practitioner",
      render: (row) => <PersonCell name={row.practitioner} />,
    },
    {
      key: "session",
      header: "Session",
      render: (row) => <span className="font-mono text-xs text-ink-muted">{row.session}</span>,
    },
    {
      key: "sessionDate",
      header: "Session date",
      render: (row) => <span className="text-sm text-ink-muted">{row.sessionDate}</span>,
    },
    {
      key: "grossPayout",
      header: "Gross Payout (₹)",
      render: (row) => <span className="text-base font-semibold text-ink">{row.grossPayout}</span>,
    },
    {
      key: "invoiceReference",
      header: "Invoice ref.",
      requires: "mutate",
      render: (row) =>
        mayEdit ? (
          <InvoiceReference key={row.id} row={row} />
        ) : (
          <span className="font-mono text-xs text-ink-muted">{row.invoiceReference ?? "—"}</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      requires: "mutate",
      render: (row) => <PayoutStatus key={row.id} row={row} />,
    },
    {
      key: "status",
      header: "Payment status",
      render: (row) => (
        <StatusPill
          {...PAYOUT_STATUS[row.status]}
          // V7 carries the date inside the pill once paid, so the settled date
          // is visible without opening anything.
          label={row.status === "Paid" && row.paidOn ? `Paid — ${row.paidOn}` : row.status}
        />
      ),
    },
  ];
}

export function PayoutsPanel({ rows, role }: { rows: readonly PayoutRow[]; role: ConsoleRole }) {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const inPeriod = rows.filter((row) => matchesPeriod(row.sessionDate, month, year));
  const unpaid = inPeriod.filter((row) => row.status !== "Paid");
  const shown = pendingOnly ? unpaid : inPeriod;

  // The figure the finance team actually needs: what is still owed, in the
  // period on screen. Summed from the raw amounts rather than the formatted
  // ones, which carry a currency symbol and thousands separators.
  const amountPending = unpaid.reduce((total, row) => total + row.grossAmount, 0);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPending);

  const card = (active: boolean) =>
    `min-w-[120px] rounded-lg border bg-red-light px-4 py-2 text-left transition-[box-shadow,border-color] ${
      active ? "border-red shadow-[0_0_0_2px_rgba(192,57,43,0.18)]" : "border-red/30 hover:border-red"
    }`;

  return (
    <>
      {/* V7 .pending-bar — two cards, and they toggle together: "how many" and
          "how much" are one question asked two ways. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={pendingOnly}
            onClick={() => setPendingOnly((only) => !only)}
            className={card(pendingOnly)}
          >
            <span className="block text-4xl font-bold leading-[1.1] text-red">{unpaid.length}</span>
            <span className="block text-xs text-ink-muted">Sessions pending payment</span>
          </button>
          <button
            type="button"
            aria-pressed={pendingOnly}
            onClick={() => setPendingOnly((only) => !only)}
            className={card(pendingOnly)}
          >
            <span className="block text-4xl font-bold leading-[1.1] text-red">{formatted}</span>
            <span className="block text-xs text-ink-muted">Amount pending</span>
          </button>
        </div>

        <PeriodFilter
          label="Session date:"
          month={month}
          year={year}
          years={yearsIn(rows.map((row) => row.sessionDate))}
          onMonth={setMonth}
          onYear={setYear}
          idPrefix="payouts-period"
        />
      </div>

      <ConsoleTable
        caption="Practitioner payouts"
        columns={columns(role)}
        rows={shown}
        role={role}
        rowKey={(row) => row.id}
        empty="No payouts yet. A payout appears once a session has been matched."
      />
    </>
  );
}
