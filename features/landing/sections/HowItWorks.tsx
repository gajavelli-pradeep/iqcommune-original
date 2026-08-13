import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The four-step process, numbered.
 *
 * Rendered as an <ol>: the steps happen in order, and the numerals are the
 * content rather than decoration. The visible circles are the list's own
 * numbering made explicit, so a screen reader hears "1" as part of the step.
 *
 * Steps 2 and 3 are the waitlist phase's wording. V7 has them as "Send your
 * request" and "We get in touch" — a request that gets answered and a schedule
 * that gets locked in, which is the promise the rest of the page stopped
 * making. They now describe what actually happens while practitioners are still
 * being empanelled: the interest is recorded, and the city is what everyone is
 * waiting on. Steps 1 and 4 needed no change — picking a topic and attending
 * the session are the same either side of launch, which is what makes the
 * section forward-looking rather than a description of today.
 */

const STEPS = [
  {
    title: "Pick a topic",
    description:
      "Choose the area that fits your need — or a 6-hour bundle covering two related modules. Unsure? We'll guide you.",
  },
  {
    title: "Join the waitlist",
    description:
      "Share your audience type and group size (up to 25). Nothing is scheduled yet — you're on the list.",
  },
  {
    title: "We map your city",
    description:
      "We're still empanelling practitioners city by city. Once one matches your topic and your city, we reach out to plan the details with you.",
  },
  {
    title: "Attend Session",
    description:
      "In-person, focused session — max 25 people — led by a practitioner still active in that field.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-surface-soft px-8 py-20">
      <div className="mx-auto max-w-page px-8">
        <SectionHeading
          tag="Process"
          headline="How it works."
          sub="Tell us what you need. Here's how a session comes together once we're live in your city."
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
