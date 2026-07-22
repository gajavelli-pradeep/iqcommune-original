import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * "A practitioner is not a trainer" — the two-column comparison.
 *
 * PARITY FIX. The spec hides the entire left column below 720px:
 *
 *     @media (max-width: 720px) { .diff-col.them { display: none } }
 *
 * That deletes half the argument on a phone. The section only means anything as
 * a contrast; with one side gone, "Our Practitioners" reads as an unsupported
 * list of claims. Responsive design relocates content, it does not delete it.
 *
 * Both columns are kept at every width. Below 720px they stack — trainers first,
 * practitioners second — so the comparison still reads top-to-bottom in the
 * order it argues.
 */

const THEM = [
  "Focus on theory & concepts",
  "Curriculum based on past market conditions",
  "Generic case studies",
  "Limited focus on investor behaviour",
  "Learning ends with the classroom",
] as const;

const US = [
  "Blend theory with practical investment applications",
  "Content updated to reflect evolving market conditions",
  "Real-world portfolio and investment examples",
  "They manage money the same way they teach you to",
  "You step out with a clear plan of action with real numbers",
] as const;

function CrossIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-ink-faint"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-gold"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function TrainerComparison() {
  return (
    <section className="bg-surface px-8 py-20">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tag="Why it matters"
          headline="A practitioner is not a trainer."
          sub="The person teaching you should still be doing it. Here's why that gap changes everything."
        />

        <div className="mx-auto grid max-w-[900px] grid-cols-1 overflow-hidden rounded-[12px] border border-border-strong min-[720px]:grid-cols-2">
          <div>
            <h3 className="border-b border-border-strong bg-surface-soft px-7 py-[1.1rem] text-sm font-semibold uppercase tracking-eyebrow text-ink-faint">
              Conventional Trainers
            </h3>
            <ul>
              {THEM.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 border-b border-border px-7 py-4 text-md text-ink-muted last:border-b-0"
                >
                  <CrossIcon />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Divider between the stacked columns on small screens; once side by
              side, V7 separates the columns by header colour alone (no rule). */}
          <div className="border-t border-border-strong min-[720px]:border-t-0">
            <h3 className="border-b border-border-strong bg-ink px-7 py-[1.1rem] text-sm font-semibold uppercase tracking-eyebrow text-surface">
              Our Practitioners
            </h3>
            <ul>
              {US.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 border-b border-border py-4 pr-7 pl-2 text-md font-medium text-ink last:border-b-0"
                >
                  <CheckIcon />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
