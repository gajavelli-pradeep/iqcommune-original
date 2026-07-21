import { SectionHeading } from "@/components/ui/SectionHeading";
import { TickIcon } from "@/components/ui/icons";

/** The closing pitch and the button that opens the application. */

const REASSURANCES = [
  "We bring the audience — you just show up and teach",
  "3–6 hours, entirely on your schedule",
  "No slides to build, no curriculum to write",
] as const;

export function ApplyCta({ apply }: { apply: React.ReactNode }) {
  return (
    <section id="apply" className="scroll-mt-20 bg-surface-soft px-4 py-16 text-center sm:px-8">
      <div className="mx-auto max-w-page">
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

        <ul className="mx-auto mb-8 mt-8 grid max-w-[720px] gap-2.5 text-left min-[720px]:grid-cols-3">
          {REASSURANCES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-base leading-[1.5] text-ink-muted">
              <TickIcon />
              {item}
            </li>
          ))}
        </ul>

        {apply}
      </div>
    </section>
  );
}
