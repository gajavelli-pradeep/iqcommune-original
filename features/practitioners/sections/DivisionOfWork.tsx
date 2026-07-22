import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Two columns of commitments. Both are kept at every width: the whole point of
 * the section is the comparison, so dropping a column on mobile would delete
 * half the argument.
 */

const YOU_BRING = [
  "Hands-on expertise in your domain",
  "Real examples from your current work",
  "Willingness to take genuine questions",
  "Availability confirmation before each session",
  "Commitment to no product cross-selling",
] as const;

const WE_HANDLE = [
  "All client acquisition and marketing",
  "Attendance-commitment enforcement with the SPOC",
  "All coordination with the SPOC — single point of contact",
  "Scheduling, confirmations & logistics",
  "Fee collection and revenue share payout",
] as const;

function Column({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "you" | "we";
}) {
  const isWe = tone === "we";
  return (
    <div className="bg-surface">
      {/* The "We Handle" header is a dark ink bar; "You Bring" is a cream bar. */}
      <div
        className={`border-b border-border-strong px-7 py-[1.1rem] text-sm font-semibold uppercase tracking-eyebrow ${
          isWe ? "bg-ink text-surface" : "bg-surface-soft text-ink-faint"
        }`}
      >
        {title}
      </div>
      <ul>
        {items.map((item) => (
          <li
            key={item}
            className={`flex items-start gap-3 border-b border-border py-4 text-md leading-[1.55] last:border-b-0 ${
              isWe ? "pr-7 pl-2 font-medium text-ink" : "px-7 text-ink-muted"
            }`}
          >
            {/* V7 .handle-icon: 15px ink-faint check for both columns, never the item colour. */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
              focusable="false"
              className="mt-[3px] shrink-0 text-ink-faint"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DivisionOfWork() {
  return (
    <section className="bg-surface px-8 py-20">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tag="Division of work"
          headline={
            <>
              Your job is to teach.
              <br />
              Everything else is ours.
            </>
          }
          sub="We've built the platform so you never have to do the work you didn't sign up for."
        />
        {/* One bordered box split into two columns, not two cards (V7 .handle-grid). */}
        <div className="mx-auto mt-10 grid max-w-[900px] grid-cols-1 overflow-hidden rounded-[12px] border border-border-strong min-[720px]:grid-cols-2">
          <Column title="You Bring" items={YOU_BRING} tone="you" />
          <Column title="We Handle" items={WE_HANDLE} tone="we" />
        </div>
      </div>
    </section>
  );
}
