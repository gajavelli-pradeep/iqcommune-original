"use client";

import type { ReactNode } from "react";

import { useFocusWhen } from "@/hooks/useFocusWhen";

/**
 * The post-submit confirmation panel the five tokenised forms hand-rolled
 * identically (audit M3/M11): a tick-in-circle, a heading that takes focus on
 * mount, an optional lede, and a slot for the receipt.
 *
 * `role="status"` + the focused heading are the a11y contract: the panel
 * replaces the form on submit, so without moving focus a screen-reader user
 * gets no confirmation a legally-binding consent or signature was recorded.
 *
 * `size` drives only the circle — the receipt/consent panels use a 56px circle
 * (`md`), onboarding/photos use 72px (`lg`).
 */

type Size = "md" | "lg";

const CIRCLE: Record<Size, { box: string; icon: number }> = {
  md: { box: "h-14 w-14", icon: 26 },
  lg: { box: "h-[72px] w-[72px]", icon: 34 },
};

const PADDING: Record<Size, string> = {
  md: "p-8",
  lg: "px-8 py-12",
};

export function SuccessPanel({
  title,
  lede,
  size = "md",
  as: Heading = "h1",
  className,
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  size?: Size;
  /** Rate's panel sits under a page-level heading, so it renders an `h2`. */
  as?: "h1" | "h2";
  /** Escape hatch for per-form padding (e.g. the rate panel's `p-6`). */
  className?: string;
  children?: ReactNode;
}) {
  const headingRef = useFocusWhen<HTMLHeadingElement>(true);
  const { box, icon } = CIRCLE[size];

  return (
    <section
      role="status"
      className={`rounded-lg border border-border bg-surface text-center ${PADDING[size]}${
        className ? ` ${className}` : ""
      }`}
    >
      <div className={`mx-auto mb-4 flex ${box} items-center justify-center rounded-full bg-green-light text-green`}>
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
          focusable="false"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <Heading ref={headingRef} tabIndex={-1} className="mb-1 text-2xl font-semibold text-ink outline-none">
        {title}
      </Heading>
      {lede ? (
        <p className={`text-base leading-[1.6] text-ink-muted${children ? " mb-5" : ""}`}>{lede}</p>
      ) : null}
      {children}
    </section>
  );
}
