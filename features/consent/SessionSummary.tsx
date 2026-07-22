/**
 * Everything the practitioner is consenting to, in the spec's three blocks.
 *
 * The payout is stated gross and says so. TDS, GST and net are administered
 * offline by finance (ADR 0001), and the spec itself already prints that —
 * showing a "net" figure this system cannot compute would be worse than
 * showing none.
 */

import type { ConsentSession } from "@/types/link-pages";

// Shape now lives in types/, out of the client graph (audit H6); re-exported so
// existing call sites keep importing it from here.
export type { ConsentSession };

/**
 * The spec's `.kv-grid`: two columns of label-over-value, no rules between
 * them. An earlier clone rendered a full-width receipt list with dividers,
 * which reads as a statement rather than as a summary of a session.
 */
function Rows({ rows }: { rows: ReadonlyArray<[string, string]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-[0.85rem] min-[480px]:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-0.5 text-xs text-ink-faint">{label}</dt>
          <dd className="text-md font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SessionSummary({ session }: { session: ConsentSession }) {
  return (
    <section className="rounded-lg border border-border bg-surface px-9 py-8">
      <h1 className="mb-1 text-3xl font-semibold text-ink">Confirm your session details</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        Please review everything below carefully. Your consent confirms acceptance of this session
        and the stated payout.
      </p>

      <Rows
        rows={[
          ["Confirmation Ref. No.", session.reference],
          ["Empanelment Agreement Ref.", session.agreementReference],
          ["Issued On", session.issuedOn],
          ["First Name", session.firstName],
        ]}
      />

      <h2 className="mb-1 mt-6 text-2xs font-semibold uppercase tracking-caps text-gold-dark">
        Session details
      </h2>
      <Rows
        rows={[
          ["Module confirmed for", session.module],
          ["Date", session.date],
          ["Start time", session.startTime],
          ["Duration", session.duration],
          ["Venue", session.venue],
          ["City, State", session.cityState],
          ["Audience type", session.audience],
          ["Participants", session.participants],
          ["SPOC name", session.spoc],
        ]}
      />

      <hr className="my-6 border-border" />

      <h2 className="mb-3 text-2xs font-semibold uppercase tracking-caps text-gold-dark">
        Payout confirmation
      </h2>
      <div className="flex items-center justify-between gap-4 rounded-lg bg-green-light px-5 py-4">
        <div>
          {/* Green, not gold: the spec treats a confirmed payout as a settled
              fact rather than a brand accent, and green is this product's
              success semantic. */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-caps text-green">
            Gross payout amount
          </p>
          <p className="text-sm leading-[1.55] text-ink-muted">
            This amount is pre-tax. TDS, GST, and net calculations are handled separately by
            iqcommune&apos;s finance team — not shown here.
          </p>
        </div>
        <p className="shrink-0 text-5xl font-semibold tabular-nums text-green">
          {session.grossPayout}
        </p>
      </div>

      <div className="mt-4">
        <Rows rows={[["Payment TAT", "+7 working days from invoice receipt"]]} />
      </div>
    </section>
  );
}
