"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Shared modal chrome. Built once because P1 needs two of them and P2 needs a
 * third, and a hand-rolled dialog gets the same three things wrong every time.
 *
 * What it guarantees:
 *
 * - **Escape closes**, and focus returns to whatever opened it.
 * - **Focus is trapped** — Tab cycles inside the panel, never behind it.
 * - **Scroll ownership is explicit.** Locking the body hands this panel the only
 *   path to its own overflow, so the panel scrolls and contains overscroll. The
 *   lock is released on *every* close path, unmount included; a modal that
 *   leaves `overflow: hidden` behind bricks the page.
 * - Height is capped in `dvh`, not `vh`: on mobile `vh` is the largest viewport
 *   and hides the bottom of the panel under browser chrome, which is where the
 *   submit button lives.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  /**
   * The handler is held in a ref, not a dependency.
   *
   * `onClose` is usually an inline arrow, so a `useCallback([onClose])` handler
   * changes identity on every render — which made the effect below tear down
   * and re-run on every keystroke, restoring the scroll lock and yanking focus
   * back to the first field mid-typing.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null,
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
    // Only `open` may re-run this: `handleKeyDown` is redefined every render but
    // reads nothing stale — the one changing value, `onClose`, comes from a ref.
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-scrim p-4 sm:p-6"
      // Clicking the backdrop closes; clicking inside must not. The check is on
      // the target rather than a stopPropagation inside the panel, so a drag
      // that ends outside the panel does not close it either.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-surface shadow-modal"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-base leading-[1.5] text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 shrink-0 rounded-md p-2 text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
              focusable="false"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* The panel is height-capped, so this is where the overflow goes. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
