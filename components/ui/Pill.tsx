import type { ReactNode } from "react";

/**
 * Small uppercase badge on a gold-tinted fill. Used for the hero's
 * "Taught by Active Professionals" and the section eyebrows further down.
 *
 * Text is --color-gold-dark, never --color-gold: gold text on a light fill
 * fails AA.
 */
export function Pill({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-light px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-dark">
      {icon}
      {children}
    </span>
  );
}
