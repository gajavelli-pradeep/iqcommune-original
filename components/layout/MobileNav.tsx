"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The small-screen navigation — a hamburger and a slide-in drawer.
 *
 * V7's header is a wordmark and one call to action, with no navigation at all.
 * That reads fine on a desktop where the whole page is a scroll away, and badly
 * on a phone where the landing page is eleven screens tall and the only way to
 * the practitioner site is a link in the footer. So this is an addition to the
 * spec, not a clone of it, and it stays inside the spec's design language:
 * ink on cream, gold for the active affordance, the same pill radius.
 *
 * Everything the drawer has to get right is a consequence of covering the page:
 *
 * - **Scroll lock.** A fixed panel over a scrollable body scrolls the body
 *   behind it. Locking transfers scroll ownership to the drawer, which then
 *   owes its own `overflow-y: auto` — a nav list can outgrow a 320px-tall
 *   landscape phone. `overscroll-contain` stops the chain from resuming on the
 *   body at either end.
 * - **Focus trap.** Tab must not walk out of a panel that covers what it lands
 *   on. On close, focus returns to the button that opened it, so a keyboard
 *   user is where they left off rather than back at the top of the document.
 * - **Escape and click-outside.** Both are how a drawer is expected to close;
 *   the scrim is a real button so a pointer user gets the same target a screen
 *   reader is told about.
 * - **Motion.** The slide is opt-in through `prefers-reduced-motion`; reduced
 *   motion still gets the drawer, just without the travel.
 *
 * The overlay is **portalled to `<body>`**, and that is not a preference.
 * SiteHeader carries `backdrop-blur`, and a `backdrop-filter` makes an element
 * the containing block for every `fixed` descendant — so rendered in place, the
 * drawer sized itself to the 68px header and scrolled its whole menu inside a
 * sliver. Measured, not guessed: clientHeight 68 against scrollHeight 492.
 */

export interface NavLink {
  /** `#anchor` for a section on the current page, or a path. */
  href: string;
  label: string;
}

const PANEL_MS = 220;

export function MobileNav({
  links,
  action,
  className = "",
}: {
  links: readonly NavLink[];
  /** The page's call to action, repeated at the foot of the drawer. */
  action?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    // Captured now, not read in cleanup: by then React may have swapped what
    // the ref points at, and focus would return to nothing.
    const returnFocusTo = opener.current;

    // No visibility filter: everything in the panel is rendered visible when it
    // is open, and the usual `offsetParent !== null` test is a layout question —
    // it answers "hidden" for every element under jsdom, which would make this
    // trap untestable and quietly focus nothing.
    const focusables = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restored on every close path, unmount and error included — a drawer
      // that leaves the body locked breaks the page it was covering.
      body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={opener}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong text-ink transition-colors hover:border-gold hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden focusable="false">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* No mount guard needed: `open` only becomes true from a click, so the
          server render never reaches the portal and there is nothing to
          hydrate-mismatch. */}
      {open
        ? createPortal(
        <div className="fixed inset-0 z-[var(--z-overlay)]">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="animate-scrim-in absolute inset-0 bg-scrim"
          />

          <div
            id={panelId}
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            style={{ animationDuration: `${PANEL_MS}ms` }}
            className="animate-drawer-in absolute inset-y-0 right-0 flex w-[min(86vw,320px)] flex-col overflow-y-auto overscroll-contain border-l border-border bg-surface shadow-modal"
          >
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-5">
              <span className="flex items-baseline leading-none">
                <span className="text-4xl font-bold tracking-display text-gold">iq</span>
                <span className="text-4xl font-light tracking-display text-ink">commune</span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden focusable="false">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Site" className="flex flex-col px-2 py-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-lg font-medium text-ink transition-colors hover:bg-surface-soft hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-gold"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {action ? (
              // `mt-auto` rather than a spacer: on a landscape phone the list
              // already fills the panel and the action should follow it, not be
              // pinned below the fold behind a scroll.
              //
              // The click handler catches the action's own click as it bubbles —
              // the action is an opaque node, so the drawer cannot be told to
              // close from inside it. Everything here is a button; a stray click
              // on the padding closing the drawer is the same outcome as a click
              // on the scrim.
              <div className="mt-auto border-t border-border p-5" onClick={() => setOpen(false)}>
                {action}
              </div>
            ) : null}
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
