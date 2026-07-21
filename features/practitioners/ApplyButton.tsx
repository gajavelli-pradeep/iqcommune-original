"use client";

/**
 * P2's primary action. `ApplyModal` is the last section of this page, so until
 * it lands this anchors to the application section rather than rendering a dead
 * control — the page's own `#apply` target, which the spec also links to.
 */
export function ApplyButton() {
  return (
    <a
      href="#apply"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-9 py-4 text-xl font-semibold text-ink shadow-gold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:hover:translate-y-0"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
        focusable="false"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      Apply to Join the Network
    </a>
  );
}
