"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  variant = "page",
  maxWidth,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Which chrome to wear. `page` is the public site's — a light header and
   * generous padding. `console` is V7's `.draft-modal`: an ink header bar with
   * a small white title, tighter body padding, and a footer rail. Three console
   * dialogs use it, so it is a real variant rather than a one-off override.
   *
   * The behaviour — Escape, focus trap, scroll lock — is identical either way,
   * which is the whole reason this is a prop and not a second component.
   */
  variant?: "page" | "console";
  /** Overrides the default width, e.g. V7's 680px photo grid. */
  maxWidth?: string;
  /** The footer rail (console variant): counts on the left, actions on the right. */
  footer?: ReactNode;
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

  // `document` is read below, so the server never gets this far. Every caller
  // opens from client state, so an open modal cannot exist on the first render.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      // Overlay layer of the z-scale — above the sticky header (audit C1). At
      // z-50 the header painted over the scrim and the top of the dialog.
      //
      // The z-index only settles that contest when the two share a stacking
      // context, which is why this is portalled to `document.body` rather than
      // rendered where it is written. `RowAction` renders its dialog inside the
      // expanded row, and that card sits in a `sticky` wrapper
      // (`ExpandableRows`) — position:sticky creates a stacking context, so the
      // whole dialog was trapped inside it at the row's own depth and the
      // header painted straight over it, no matter how high this number went.
      className="fixed inset-0 z-[var(--z-overlay)] flex items-start justify-center overflow-y-auto overscroll-contain bg-scrim p-4 sm:p-6"
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
        style={maxWidth ? { maxWidth } : undefined}
        className={`my-auto flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden bg-surface shadow-modal ${
          maxWidth ? "" : variant === "console" ? "max-w-[580px]" : "max-w-[520px]"
        } ${variant === "console" ? "rounded-[10px]" : "rounded-xl"}`}
      >
        {variant === "console" ? (
          // V7 `.draft-header` — an ink bar, so the dialog reads as console
          // chrome rather than as part of the page behind it.
          <div className="flex flex-shrink-0 items-center justify-between gap-4 bg-ink px-6 py-[1.1rem]">
            <div>
              {/* V7 `.draft-header-title` is 14px/500 and `.draft-header-sub`
                  11px — both shared by every console dialog, so the sizes are
                  matched here rather than overridden per dialog. */}
              <h2 id={titleId} className="text-md font-medium text-surface">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-px text-xs text-on-dark-faint">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-on-dark-muted transition-colors hover:bg-tool-card-hover hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 border-b border-border px-10 pb-5 pt-10">
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
        )}

        {/* The panel is height-capped, so this is where the overflow goes. */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
            // V7 `.draft-body`: 1.25rem vertical, 1.5rem horizontal — not the
            // uniform 20px this carried before.
            variant === "console" ? "px-6 py-5" : "px-10 py-6"
          }`}
        >
          {children}
        </div>

        {/* V7 `.photo-modal-footer` — a fixed rail, so the actions stay put
            while the grid above them scrolls. */}
        {footer ? (
          <div className="flex flex-shrink-0 items-center justify-between gap-2.5 border-t border-border px-5 py-[0.85rem]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
