import { IconStrip, type IconStripEntry } from "@/components/ui/IconStrip";

/** Gold band under the hero — the three objections a practitioner arrives with. */

const TICK = <polyline points="20 6 9 17 4 12" />;

const CLAIMS: readonly IconStripEntry[] = [
  { label: "Zero public exposure — you control what's shared", icon: TICK },
  { label: "No upfront fees — ever", icon: TICK },
  { label: "No sales or business development required", icon: TICK },
];

export function TrustBar() {
  return (
    <IconStrip
      entries={CLAIMS}
      className="border-y border-gold-border bg-gold-light px-8 py-[0.85rem]"
      listClassName="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-5 gap-y-2.5 md:gap-x-10"
      itemClassName="flex items-center gap-2 text-[13px] font-medium text-gold-dark"
      iconSize={13}
    />
  );
}
