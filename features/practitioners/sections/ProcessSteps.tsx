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
    <section className="bg-surface-soft px-8 py-16">
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
        <ol className="mt-10 grid gap-5 min-[560px]:grid-cols-2 min-[900px]:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden
                className="mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-gold-border bg-gold-light text-2xl font-semibold text-gold-dark"
              >
                {index + 1}
              </span>
              <h3 className="mb-1.5 text-md font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-[1.6] text-ink-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
