import { IconStrip, type IconStripEntry } from "@/components/ui/IconStrip";

/**
 * The closing call to action.
 *
 * Found by the F4 parity gate, not by the section list — spec line 1487.
 *
 * Its "Request a Session" button ships with `RequestModal`, the thing it opens.
 * The same rule already defers the header and hero buttons: a control that
 * renders a pointer cursor and does nothing is a P1 defect, and three of them
 * would be three.
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
    <section className="bg-surface-soft px-4 py-16 text-center sm:px-8">
      <div className="mx-auto max-w-page">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-light px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-dark">
            Get Started
          </span>
        </div>
        <h2 className="mb-4 text-[clamp(26px,3.8vw,40px)] font-semibold leading-[1.2] tracking-body text-ink">
          If you are serious to improve your financial literacy
        </h2>
        <p className="mx-auto mb-8 max-w-[560px] text-xl text-ink-muted">
          Tell us your topic, your group, and a preferred date window. We&apos;ll handle the
          rest offline.
        </p>

        <IconStrip
          entries={REASSURANCES}
          listClassName="mx-auto flex max-w-[900px] flex-wrap items-center justify-center gap-x-6 gap-y-2.5"
          itemClassName="flex items-center gap-2 text-sm text-ink-muted"
          iconClassName="text-green"
          iconSize={13}
        />
      </div>
    </section>
  );
}
