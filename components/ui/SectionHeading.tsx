import type { ReactNode } from "react";
import { Pill } from "./Pill";

/**
 * The eyebrow / headline / sub-line lockup that opens almost every section on
 * the marketing pages. Built once here rather than repeated per section.
 *
 * `sub` is optional — a few sections have only a headline.
 */
export function SectionHeading({
  tag,
  headline,
  sub,
}: {
  tag: string;
  headline: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <>
      <div className="mb-4 text-center">
        <Pill>{tag}</Pill>
      </div>
      <h2 className="mb-4 text-center text-[clamp(26px,3.8vw,40px)] font-semibold leading-[1.2] tracking-body text-ink">
        {headline}
      </h2>
      {sub && (
        <p className="mx-auto mb-12 max-w-[520px] text-center text-xl text-ink-muted">
          {sub}
        </p>
      )}
    </>
  );
}
