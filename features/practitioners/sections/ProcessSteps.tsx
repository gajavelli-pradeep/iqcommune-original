import { SectionHeading } from "@/components/ui/SectionHeading";

/** Four steps, as an ordered list — the order is the meaning. */

const STEPS: ReadonlyArray<{ title: string; description: string }> = [
  {
    title: "Apply in 5 minutes",
    description:
      "Tell us your current role, years of experience, and which module you'd teach. A short note on why you want to do this.",
  },
  {
    title: "We reach out",
    description:
      "Within 2–3 working days. A brief conversation — no formal interview, no audition. Just a check for fit and intent.",
  },
  {
    title: "Get matched",
    description:
      "We align you to a module that fits your active expertise. When a session is requested, we check your availability first.",
  },
  {
    title: "Teach & earn",
    description:
      "Show up, teach from your own experience, answer real questions. Revenue share is paid out after each confirmed session.",
  },
];

export function ProcessSteps() {
  return (
    <section className="bg-surface px-8 py-20">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="The process"
          headline={
            <>
              Simple from your end.
              <br />
              Deliberately so.
            </>
          }
          sub="We've structured this so your time investment is minimal — until you're actually in the room teaching."
        />
        {/* V7 .steps: a centred, wrapping row — each step max 210px in a 960px band. */}
        <ol className="mx-auto mt-10 flex max-w-[960px] flex-wrap justify-center gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="max-w-[210px] flex-[1_1_180px] text-center">
              <span
                aria-hidden
                className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink text-3xl font-semibold text-surface"
              >
                {index + 1}
              </span>
              <h3 className="mb-1.5 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="text-base leading-[1.6] text-ink-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
