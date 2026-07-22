import { IconStrip, type IconStripEntry } from "@/components/ui/IconStrip";

/**
 * The two full-width strips the spec places between the hero and the
 * differentiator: a dark trust bar and a gold audience ribbon.
 *
 * Both were absent from the P1 section list and were found by the F4 parity
 * gate, not by reading — which is the entire argument for the gate.
 *
 * They are structurally identical (icon + short label, centred, wrapping), so
 * they render through one `IconStrip` rather than as two hand-built rows.
 */

const TRUST: readonly IconStripEntry[] = [
  {
    label: "All practitioners currently active in that specific domain",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    label: "In-person sessions only — not online",
    icon: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    label: "Max 25 participants per session",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
];

const AUDIENCES: readonly IconStripEntry[] = [
  {
    label: "Groups",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    label: "Organisations & Institutions",
    icon: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
  },
  {
    label: "AMCs & Wealth Management Firms",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
];

/** Gaps collapse below the spec's tablet breakpoint; without it three long
 *  labels wrap into an unreadable stack at 320px. */
const LIST = "mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-5 gap-y-3 md:gap-x-12";

export function TrustBar() {
  return (
    <IconStrip
      entries={TRUST}
      listClassName={LIST}
      // Spec uses rgba(255,255,255,.82); --color-on-dark-bright (.75) is the
      // nearest token and already clears AA on ink. No new literal.
      className="bg-ink px-8 py-[0.9rem] text-on-dark-bright"
      itemClassName="flex items-center gap-[9px] text-[13px]"
      iconClassName="opacity-65"
    />
  );
}

export function AudienceRibbon() {
  return (
    <IconStrip
      entries={AUDIENCES}
      // V7 .inperson-ribbon-inner uses a 2.5rem gap (the trust bar uses 3rem).
      listClassName="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-5 gap-y-3 md:gap-x-10"
      className="border-y border-gold-border bg-gold-light px-8 py-[0.85rem]"
      itemClassName="flex items-center gap-2 text-[13px] font-medium text-gold-dark"
    />
  );
}
