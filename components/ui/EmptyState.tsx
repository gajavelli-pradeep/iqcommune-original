import type { ReactNode } from "react";

/**
 * The designed "nothing here yet" state — one of the three states every data
 * view must handle (empty · loading · error). An empty list rendered as a bare
 * blank is indistinguishable from a broken one; this names the emptiness and,
 * where there's a next step, offers it. `icon` and `action` are optional slots.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-12 text-center ${className}`}
    >
      {icon ? (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-soft text-ink-faint">
          {icon}
        </div>
      ) : null}
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[420px] text-base leading-[1.55] text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
