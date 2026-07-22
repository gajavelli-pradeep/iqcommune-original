import type { ReactNode } from "react";
import { Pill } from "./Pill";

/**
 * The eyebrow / headline / sub-line lockup that opens almost every section on
 * the marketing pages. Built once here rather than repeated per section.
 *
 * `tone` carries the light/dark inversion (audit D-M): the dark bands (Gallery,
 * ToolsCalculators) previously hand-rolled a copy that differed only in colour.
 * The one visual difference between the tones is the eyebrow — `Pill` is
 * gold-on-cream and unreadable on ink, so the dark eyebrow is its own chip.
 *
 * `sub` is optional — a few sections have only a headline.
 */
export function SectionHeading({
  tag,
  headline,
  sub,
  tone = "light",
}: {
  tag: string;
  headline: ReactNode;
  sub?: ReactNode;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <>
      <div className="mb-4 text-center">
        {dark ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-tool-chip-edge bg-tool-chip px-3.5 py-[5px] text-xs font-semibold uppercase tracking-pill text-gold-bright">
            {tag}
          </span>
        ) : (
          <Pill>{tag}</Pill>
        )}
      </div>
      <h2
        className={`mb-4 text-center text-[clamp(26px,3.8vw,40px)] font-semibold leading-[1.2] tracking-body ${
          dark ? "text-surface" : "text-ink"
        }`}
      >
        {headline}
      </h2>
      {sub && (
        <p
          className={`mx-auto mb-12 max-w-[520px] text-center text-xl ${
            dark ? "text-on-dark-muted" : "text-ink-muted"
          }`}
        >
          {sub}
        </p>
      )}
    </>
  );
}
