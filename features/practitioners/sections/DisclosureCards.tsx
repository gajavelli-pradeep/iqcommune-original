import { SectionHeading } from "@/components/ui/SectionHeading";

/** What is never shared, and what is — the section the spec is most careful about. */

const NEVER_PUBLIC = [
  "Your full name",
  "Your employer's name",
  "Your personal contact details",
  "Any photos, profiles, or endorsements",
] as const;

const SHARED_ON_CONFIRMATION = [
  "Your first name only",
  "Years of experience and domain",
  "Your organisation or practice name — shared with your consent, adds credibility with the organiser. Independent practitioners are described as such.",
  "A coordination contact through iqcommune — not your personal number",
] as const;

function Tier({
  heading,
  title,
  items,
  tone,
}: {
  heading: string;
  title: string;
  items: readonly string[];
  tone: "never" | "shared";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p
        className={`mb-1 text-2xs font-semibold uppercase tracking-caps ${
          tone === "never" ? "text-green" : "text-gold-dark"
        }`}
      >
        {heading}
      </p>
      <h3 className="mb-4 text-md font-semibold text-ink">{title}</h3>
      <ul>
        {items.map((item) => (
          <li
            key={item}
            className="mb-2.5 flex items-start gap-2.5 text-base leading-[1.55] text-ink-muted last:mb-0"
          >
            <span
              aria-hidden
              className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === "never" ? "bg-green" : "bg-gold"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DisclosureCards() {
  return (
    <section className="bg-surface-soft px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Transparency"
          headline={
            <>
              How disclosure actually works.
              <br />
              Two tiers. Both on your terms.
            </>
          }
          sub="We want to be completely honest with you — because vague privacy promises help no one."
        />

        <div className="mt-10 grid gap-4 min-[720px]:grid-cols-2">
          <Tier
            heading="Public — Never disclosed"
            title="What the world never sees"
            items={NEVER_PUBLIC}
            tone="never"
          />
          <Tier
            heading="Operational — Shared only when a session is confirmed"
            title="What the session organiser receives"
            items={SHARED_ON_CONFIRMATION}
            tone="shared"
          />
        </div>

        <p className="mt-6 rounded-lg border border-border bg-surface px-6 py-5 text-base leading-[1.7] text-ink-muted">
          Once you confirm availability for a session, the client-side organiser receives a brief
          professional profile — nothing more. Because you&apos;re providing explicit consent, we
          include your organisation or practice name to establish credibility upfront. If you are
          independent, we&apos;ll describe you as an independent practitioner in your domain.{" "}
          Nothing that identifies you is ever displayed on our website, marketing, or any
          public-facing channel. We&apos;ll be honest about one thing we can&apos;t fully control:
          once a session is confirmed, the organiser knows a practitioner is coming. Like any
          in-person engagement, your identity becomes known in the room. What we commit to is that
          this only happens after your explicit availability confirmation — and that we never
          facilitate direct client-to-practitioner contact outside our coordination layer.{" "}
          <strong className="font-medium text-ink">
            Your consent to this operational disclosure is captured during onboarding — and is
            entirely voluntary.
          </strong>
        </p>
      </div>
    </section>
  );
}
