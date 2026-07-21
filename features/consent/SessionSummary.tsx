/**
 * Everything the practitioner is consenting to, in the spec's three blocks.
 *
 * The payout is stated gross and says so. TDS, GST and net are administered
 * offline by finance (ADR 0001), and the spec itself already prints that —
 * showing a "net" figure this system cannot compute would be worse than
 * showing none.
 */

export interface ConsentSession {
  reference: string;
  agreementReference: string;
  issuedOn: string;
  firstName: string;
  module: string;
  date: string;
  startTime: string;
  duration: string;
  venue: string;
  cityState: string;
  audience: string;
  participants: string;
  spoc: string;
  grossPayout: string;
}

function Rows({ rows }: { rows: ReadonlyArray<[string, string]> }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
        >
          <dt className="text-sm text-ink-muted">{label}</dt>
          <dd className="text-right text-base font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SessionSummary({ session }: { session: ConsentSession }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6">
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
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gold-border bg-gold-light px-5 py-4">
        <div>
          <p className="mb-1 text-md font-semibold text-ink">Gross payout amount</p>
          <p className="text-sm leading-[1.55] text-gold-dark">
            This amount is pre-tax. TDS, GST, and net calculations are handled separately by
            iqcommune&apos;s finance team — not shown here.
          </p>
        </div>
        <p className="shrink-0 text-4xl font-semibold tabular-nums text-ink">
          {session.grossPayout}
        </p>
      </div>

      <div className="mt-4">
        <Rows rows={[["Payment TAT", "+7 working days from invoice receipt"]]} />
      </div>
    </section>
  );
}
