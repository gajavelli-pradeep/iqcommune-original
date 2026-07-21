import { SectionHeading } from "@/components/ui/SectionHeading";
import { TickIcon } from "@/components/ui/icons";

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

function Column({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="mb-4 text-2xs font-semibold uppercase tracking-caps text-gold-dark">
        {title}
      </h3>
      <ul>
        {items.map((item) => (
          <li
            key={item}
            className="mb-2.5 flex items-start gap-2.5 text-base leading-[1.55] text-ink-muted last:mb-0"
          >
            <TickIcon />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DivisionOfWork() {
  return (
    <section className="bg-surface px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-page">
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
        <div className="mt-10 grid gap-4 min-[720px]:grid-cols-2">
          <Column title="You Bring" items={YOU_BRING} />
          <Column title="We Handle" items={WE_HANDLE} />
        </div>
      </div>
    </section>
  );
}
