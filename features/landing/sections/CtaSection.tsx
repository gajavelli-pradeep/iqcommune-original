import { IconStrip, type IconStripEntry } from "@/components/ui/IconStrip";
import { RequestSessionButton } from "../RequestSession";

/**
 * The closing call to action.
 *
 * Found by the F4 parity gate, not by the section list — spec line 1487.
 *
 * Its "Request a Session" button opens `RequestModal` through the landing
 * page's dialog provider — the same button, and the same state, as the header
 * and hero.
 */

const TICK = (
  <polyline points="20 6 9 17 4 12" />
);

const REASSURANCES: readonly IconStripEntry[] = [
  { label: "No fixed slots — we schedule around you", icon: TICK },
  { label: "Max 25 participants per session", icon: TICK },
  { label: "We'll reach out within 2–3 working days", icon: TICK },
];

export function CtaSection() {
  return (
    <section className="bg-ink px-8 py-[5.5rem] text-center">
      <div className="mx-auto max-w-page px-8">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-tool-chip-edge bg-tool-chip px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-bright">
            Get Started
          </span>
        </div>
        <h2 className="mb-4 text-[clamp(26px,3.8vw,40px)] font-semibold leading-[1.2] tracking-body text-surface">
          If you are serious to improve your financial literacy
        </h2>
        <p className="mx-auto mb-8 max-w-[520px] text-xl text-on-dark-muted">
          Tell us your topic, your group, and a preferred date window. We&apos;ll handle the
          rest offline.
        </p>

        <div className="mb-8">
          <RequestSessionButton />
        </div>

        <IconStrip
          entries={REASSURANCES}
          listClassName="mx-auto flex max-w-[900px] flex-wrap items-center justify-center gap-x-8 gap-y-2.5"
          itemClassName="flex items-center gap-2 text-base text-on-dark-muted"
          iconClassName="text-gold"
          iconSize={13}
        />
      </div>
    </section>
  );
}
