import type { ReactNode } from "react";

/**
 * The label/value pair list the tokenised pages repeated ~8× (audit M3), in two
 * shapes:
 *  - `receipt` — stacked bordered rows in a soft panel, label left / value
 *    right, divider between rows and none after the last (the success receipts).
 *  - `grid` — a responsive 2-column list, label small-caps above the value
 *    (the onboarding detail block, the photo-session details).
 *
 * `emphasis` colours a value green — the one row that is the point of the
 * receipt (e.g. the rating just given).
 */

export interface KeyValueRow {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

export function KeyValueGrid({
  rows,
  variant = "receipt",
  className,
}: {
  rows: ReadonlyArray<KeyValueRow>;
  variant?: "receipt" | "grid";
  /** Override the container — e.g. the photo grid's `min-[600px]:grid-cols-4`. */
  className?: string;
}) {
  if (variant === "grid") {
    return (
      <dl className={className ?? "grid gap-3 min-[480px]:grid-cols-2"}>
        {rows.map(({ label, value, emphasis }) => (
          <div key={label}>
            <dt className="text-2xs uppercase tracking-caps text-ink-faint">{label}</dt>
            <dd className={`text-base font-medium ${emphasis ? "text-green" : "text-ink"}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={className ?? "rounded-lg border border-border bg-surface-soft px-4 py-3 text-left"}>
      {rows.map(({ label, value, emphasis }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
        >
          <dt className="text-sm text-ink-muted">{label}</dt>
          <dd className={`text-right text-base font-medium ${emphasis ? "text-green" : "text-ink"}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
