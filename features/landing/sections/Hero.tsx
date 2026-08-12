import { RequestSessionButton } from "../RequestSession";
import { Pill } from "@/components/ui/Pill";
import { ClockIcon, StarIcon } from "@/components/ui/icons";
import { PractitionerPoolCard } from "../components/PractitionerPoolCard";

/**
 * Landing hero: pitch on the left, practitioner-pool panel on the right.
 *
 * Two columns above 720px, stacked below — the spec's own breakpoint. The
 * decorative gold glow is dropped on small screens for the same reason the spec
 * drops it: at 560px across it swamps a phone.
 *
 * Its "Join the Waitlist" button opens `RequestModal` via the landing page's
 * dialog provider.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface-soft px-8 pt-20 pb-[4.5rem]">
      {/* Decorative glow. aria-hidden and pointer-events-none: it is paint, not
          content, and must never intercept a click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[140px] -right-[100px] hidden h-[560px] w-[560px] min-[720px]:block"
        style={{
          background:
            "radial-gradient(circle, var(--color-gold-light) 0%, transparent 68%)",
        }}
      />

      <div className="relative mx-auto grid max-w-page grid-cols-1 items-center gap-10 min-[720px]:grid-cols-2 min-[720px]:gap-16">
        <div>
          <div className="animate-fade-up animate-fade-up-1 mb-6">
            <Pill icon={<StarIcon />}>Taught by Active Professionals</Pill>
          </div>

          <h1 className="animate-fade-up animate-fade-up-2 mb-5 text-[clamp(30px,4.2vw,48px)] font-semibold leading-[1.18] tracking-body text-ink">
            Real financial insights from <em className="not-italic text-gold">active</em>{" "}
            professionals — backed by years of experience.
          </h1>

          <p className="animate-fade-up animate-fade-up-3 mb-8 max-w-[440px] text-lead leading-[1.65] text-ink-muted">
            Built for anyone serious about financial literacy.
          </p>

          <div className="animate-fade-up animate-fade-up-4 flex flex-wrap items-center gap-5">
            <RequestSessionButton variant="primary" />
            <span className="flex items-center gap-1.5 text-base text-ink-faint">
              <ClockIcon />
              We&apos;ll notify you when we launch in your city
            </span>
          </div>
        </div>

        <PractitionerPoolCard />
      </div>
    </section>
  );
}
