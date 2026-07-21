/**
 * The arrow that trails a call-to-action. Decorative — the link text already
 * says where it goes — so it is hidden from assistive tech.
 *
 * `stroke="currentColor"` is what lets it inherit the link's hover colour.
 */
export function ArrowRightIcon({
  size = 13,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
