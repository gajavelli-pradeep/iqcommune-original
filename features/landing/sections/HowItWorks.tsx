import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The four-step process, numbered.
 *
 * Rendered as an <ol>: the steps happen in order, and the numerals are the
 * content rather than decoration. The visible circles are the list's own
 * numbering made explicit, so a screen reader hears "1" as part of the step.
 */

const STEPS = [
  {
    title: "Pick a topic",
    description:
      "Choose the area that fits your need — or a 6-hour bundle covering two related modules. Unsure? We'll guide you.",
  },
  {
    title: "Send your request",
    description:
      "Share your audience type, group size (up to 25), and a preferred date window. We take it from there.",
  },
  {
    title: "We get in touch",
    description:
      "Our team reaches out to confirm details, align the right practitioner, and lock in the schedule with you.",
  },
  {
    title: "Attend Session",
    description:
      "In-person, focused session — max 25 people — led by a practitioner still active in that field.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-surface-soft px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Process"
          headline="How it works."
          sub="Tell us what you need. We align the right practitioner and schedule around you."
        />

        {/* flex-wrap with a 180px basis: four across on desktop, two on a
            tablet, one on a phone, without a media query. */}
        <ol className="mx-auto flex max-w-[960px] flex-wrap justify-center gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="max-w-[210px] flex-[1_1_180px] text-center">
              <span className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink text-3xl font-semibold text-surface">
                {index + 1}
              </span>
              <h3 className="mb-1.5 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="text-md leading-[1.6] text-ink-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
