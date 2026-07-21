/** The session being rated. Values come from the database, never from the URL. */

export interface RatedSession {
  practitioner: string;
  module: string;
  sessionDate: string;
  city: string;
  reference: string;
  requestedBy: string;
}

export function SessionDetailsCard({ session }: { session: RatedSession }) {
  const rows: ReadonlyArray<[string, string]> = [
    ["Practitioner", session.practitioner],
    ["Module", session.module],
    ["Session date", session.sessionDate],
    ["City", session.city],
    ["Session ref.", session.reference],
    ["Requested by", session.requestedBy],
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h1 className="mb-1 text-3xl font-semibold text-ink">How was your session?</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        Your feedback helps us maintain quality across our practitioner network — it takes less
        than a minute.
      </p>
      <dl className="grid gap-0">
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
    </section>
  );
}
