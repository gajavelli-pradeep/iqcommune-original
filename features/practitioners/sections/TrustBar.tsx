import { IconStrip, type IconStripEntry } from "@/components/ui/IconStrip";

/** Gold band under the hero — the three objections a practitioner arrives with.
 *  Each claim carries its own V7 icon: shield, dollar, clipboard-check. */

const CLAIMS: readonly IconStripEntry[] = [
  {
    label: "Zero public exposure — you control what's shared",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    label: "No upfront fees — ever",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    label: "No sales or business development required",
    icon: (
      <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
];

export function TrustBar() {
  return (
    <IconStrip
      entries={CLAIMS}
      className="border-y border-gold-border bg-gold-light px-8 py-[0.9rem]"
      listClassName="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-5 gap-y-2.5 md:gap-x-12"
      itemClassName="flex items-center gap-[9px] text-[13px] font-medium text-gold-dark"
      iconSize={15}
    />
  );
}
