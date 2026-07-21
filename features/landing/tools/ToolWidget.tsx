"use client";

import { useId } from "react";
import type { ReactNode } from "react";

/**
 * Shared chrome for the six calculators: the dark card, its inset widget panel,
 * and the controls inside it. Built once here so a calculator file contains
 * only its own arithmetic.
 */

export function ToolCard({
  module,
  name,
  description,
  children,
}: {
  module: string;
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col rounded-lg border border-tool-edge bg-tool-card p-5 transition-[background,border-color] duration-200 hover:border-tool-edge-hover hover:bg-tool-card-hover">
      <div className="mb-4">
        <p className="mb-2 text-2xs font-semibold uppercase tracking-caps text-gold">
          {module}
        </p>
        <h3 className="mb-1 text-md font-medium text-surface">{name}</h3>
        <p className="text-sm leading-[1.5] text-on-dark-muted">{description}</p>
      </div>
      {children}
    </li>
  );
}

export function ToolPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-auto flex-1 overflow-hidden rounded-lg border border-tool-seam bg-tool-well">
      <div className="flex items-center justify-between border-b border-tool-seam-soft px-[13px] py-[9px]">
        <span className="text-xs font-medium text-on-dark-bright">{title}</span>
        <span className="rounded-full border-[0.5px] border-tool-chip-edge bg-tool-chip px-[7px] py-0.5 text-2xs text-gold">
          Try it
        </span>
      </div>
      <div className="px-[13px] py-3">{children}</div>
    </div>
  );
}

/**
 * Labelled range input. The label is a real <label> bound to the input, and the
 * live value is announced politely — the spec's version updates a bare <span>,
 * which a screen-reader user never hears.
 */
export function ToolSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="mb-[9px]">
      <label
        htmlFor={id}
        className="mb-[3px] flex items-center justify-between text-2xs uppercase tracking-label text-on-dark-faint"
      >
        {label}
        <output htmlFor={id} aria-live="polite" className="text-xs font-medium tracking-normal normal-case text-on-dark-bright">
          {display}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer bg-transparent accent-gold"
      />
    </div>
  );
}

export function ResultBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    neutral: "text-on-dark-bright",
    good: "text-result-good",
    bad: "text-result-bad",
    warn: "text-gold",
  }[tone];
  return (
    <div className="rounded-sm bg-tool-box px-[9px] py-[7px]">
      <div className="mb-0.5 text-2xs uppercase tracking-label text-on-dark-faint">
        {label}
      </div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

export function ResultGrid({ columns, children }: { columns: 2 | 3; children: ReactNode }) {
  return (
    <div className={`mt-2.5 grid gap-[5px] ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {children}
    </div>
  );
}

/** Proportional bar — a budget split, an allocation. Decorative: the same
 *  numbers are always stated in the result boxes beside it. */
export function SegmentBar({
  segments,
}: {
  segments: ReadonlyArray<{ label: string; percent: number; color: string }>;
}) {
  return (
    <div className="mt-2 flex h-1.5 gap-px overflow-hidden rounded-sm" aria-hidden="true">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="h-full transition-[width] duration-300"
          style={{ width: `${segment.percent}%`, background: segment.color }}
        />
      ))}
    </div>
  );
}

export function ToolFlag({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad";
  children: ReactNode;
}) {
  const toneClass = {
    good: "bg-flag-good border-flag-good-edge text-result-good",
    warn: "bg-flag-warn border-flag-warn-edge text-gold",
    bad: "bg-flag-bad border-flag-bad-edge text-result-bad",
  }[tone];
  return (
    <p
      aria-live="polite"
      className={`mt-2 rounded-sm border-[0.5px] px-[9px] py-1.5 text-xs leading-[1.4] ${toneClass}`}
    >
      {children}
    </p>
  );
}
