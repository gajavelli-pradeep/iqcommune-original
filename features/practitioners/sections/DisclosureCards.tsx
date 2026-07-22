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
  body,
  items,
  tone,
}: {
  heading: string;
  title: string;
  body: string;
  items: readonly string[];
  tone: "public" | "operational";
}) {
  const isOperational = tone === "operational";
  return (
    <div
      className={`rounded-[12px] border p-7 ${
        isOperational ? "border-gold-border bg-gold-light" : "border-border bg-surface-soft"
      }`}
    >
      <p
        className={`mb-2 text-xs font-semibold uppercase tracking-caps ${
          isOperational ? "text-gold-dark" : "text-ink-faint"
        }`}
      >
        {heading}
      </p>
      <h3 className="mb-3 text-lead font-semibold leading-[1.25] tracking-body text-ink">{title}</h3>
      <p className="text-[13.5px] leading-[1.65] text-ink-muted">{body}</p>
      <ul className="mt-[0.85rem] flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-[9px] text-base leading-[1.5] text-ink-muted"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={isOperational ? 2.5 : 2}
              aria-hidden
              focusable="false"
              className={`mt-[3px] shrink-0 ${isOperational ? "text-gold-dark" : "text-ink-faint"}`}
            >
              {isOperational ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </>
              )}
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DisclosureCards() {
  return (
    <section className="bg-surface px-8 py-16">
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

        <div className="mx-auto mt-10 grid max-w-[880px] gap-5 min-[720px]:grid-cols-2">
          <Tier
            heading="Public — Never disclosed"
            title="What the world never sees"
            body="Nothing that identifies you is ever displayed on our website, marketing, or any public-facing channel."
            items={NEVER_PUBLIC}
            tone="public"
          />
          <Tier
            heading="Operational — Shared only when a session is confirmed"
            title="What the session organiser receives"
            body="Once you confirm availability for a session, the client-side organiser receives a brief professional profile — nothing more. Because you're providing explicit consent, we include your organisation or practice name to establish credibility upfront. If you are independent, we'll describe you as an independent practitioner in your domain."
            items={SHARED_ON_CONFIRMATION}
            tone="operational"
          />
        </div>

        <p className="mx-auto mt-6 flex max-w-[880px] items-start gap-2.5 rounded-r-[12px] border border-border border-l-[3px] border-l-gold bg-surface-soft px-5 py-4 text-[13.5px] leading-[1.65] text-ink-muted">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            focusable="false"
            className="mt-[3px] shrink-0 text-gold-dark"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>
            We&apos;ll be honest about one thing we can&apos;t fully control: once a session is
            confirmed, the organiser knows a practitioner is coming. Like any in-person engagement,
            your identity becomes known in the room.{" "}
            <strong className="font-semibold text-ink">
              What we commit to is that this only happens after your explicit availability
              confirmation — and that we never facilitate direct client-to-practitioner contact
              outside our coordination layer.
            </strong>{" "}
            Your consent to this operational disclosure is captured during onboarding — and is
            entirely voluntary.
          </span>
        </p>
      </div>
    </section>
  );
}
