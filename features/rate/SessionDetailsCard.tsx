/** The session being rated. Values come from the database, never from the URL. */

import type { RatedSession } from "@/types/link-pages";

// Re-exported so existing call sites keep importing it from here (audit H6:
// the shape now lives in types/, out of the client graph).
export type { RatedSession };

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
    <section className="rounded-lg border border-border bg-surface px-9 py-8">
      <h1 className="mb-1 text-3xl font-semibold text-ink">How was your session?</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        Your feedback helps us maintain quality across our practitioner network — it takes less
        than a minute.
      </p>
      <dl className="grid gap-x-6 gap-y-[0.85rem] min-[480px]:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-0.5 text-xs text-ink-faint">{label}</dt>
          <dd className="text-md font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
    </section>
  );
}
