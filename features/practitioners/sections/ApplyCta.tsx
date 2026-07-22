import { SectionHeading } from "@/components/ui/SectionHeading";

/** The closing pitch and the button that opens the application. */

const REASSURANCES = [
  "We bring the audience — you just show up and teach",
  "3–6 hours, entirely on your schedule",
  "No slides to build, no curriculum to write",
] as const;

export function ApplyCta({ apply }: { apply: React.ReactNode }) {
  return (
    <section id="apply" className="scroll-mt-20 bg-surface-soft px-8 py-20 text-center">
      <div className="mx-auto max-w-[640px]">
        <SectionHeading
          tag="Apply"
          headline={
            <>
              Five minutes.
              <br />
              That&apos;s all we ask.
            </>
          }
          sub="No formal interview, no audition. Just tell us who you are and what you'd teach. We'll take it from there."
        />

        {/* V7: a centred vertical stack, not a 3-across grid. */}
        <ul className="mx-auto mt-7 mb-8 flex flex-col items-center gap-3">
          {REASSURANCES.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[14.5px] text-ink-muted">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden
                focusable="false"
                className="shrink-0 text-gold-dark"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        {apply}
      </div>
    </section>
  );
}
