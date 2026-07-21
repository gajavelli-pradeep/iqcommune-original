/**
 * Shared inline icons.
 *
 * All decorative: every one sits beside text that already carries the meaning,
 * so they are hidden from assistive tech. `stroke="currentColor"` lets them
 * inherit hover and focus colours from their container.
 *
 * An icon that ever becomes the only label for a control must gain a title and
 * lose aria-hidden — none of these do today.
 */

type IconProps = { size?: number; className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "aria-hidden": true as const,
  focusable: "false" as const,
};

export function StarIcon({ size = 12, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.5} className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ClockIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function InfoCircleIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
