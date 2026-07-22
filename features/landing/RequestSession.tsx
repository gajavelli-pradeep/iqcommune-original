"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Deferred (audit H8): the modal bodies pull the zod barrel (~65KB gz), and a
// provider ships on first paint. Loading them on open instead takes zod out of
// the landing bundle — the whole reason `/` was over its 200KB budget.
const RequestModal = dynamic(() => import("./sections/RequestModal").then((m) => m.RequestModal));
const PostSessionModal = dynamic(() =>
  import("./sections/PostSessionModal").then((m) => m.PostSessionModal),
);

/**
 * Owns the landing page's two dialogs.
 *
 * Three separate buttons open the request modal — header, hero and closing CTA
 * — so the open state cannot live in any one of them. The page stays a server
 * component; only this provider and its buttons ship JavaScript.
 */

interface LandingDialogs {
  openRequest: () => void;
  openPhotoSubmission: () => void;
}

const Context = createContext<LandingDialogs | undefined>(undefined);

function useLandingDialogs(): LandingDialogs {
  const context = useContext(Context);
  if (!context) {
    throw new Error("RequestSessionButton must be rendered inside <RequestSessionProvider>");
  }
  return context;
}

export function RequestSessionProvider({ children }: { children: ReactNode }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);

  const value = useMemo(
    () => ({ openRequest: () => setRequestOpen(true), openPhotoSubmission: () => setPhotosOpen(true) }),
    [],
  );

  return (
    <Context.Provider value={value}>
      {children}
      {/* Rendered only once opened, so the dynamic chunk (and zod) loads on
          demand rather than at first paint. */}
      {requestOpen ? <RequestModal open onClose={() => setRequestOpen(false)} /> : null}
      {photosOpen ? <PostSessionModal open onClose={() => setPhotosOpen(false)} /> : null}
    </Context.Provider>
  );
}

/**
 * The spec defines three button classes, not one: `.btn-nav` (ink, header),
 * `.btn-gold` (gold, hero and closing CTA) and `.btn-ghost` (outlined). They
 * differ in fill, size, padding and shadow — collapsing them into a single
 * component is what put a gold button in the header.
 *
 * All three are pills (`border-radius: 100px`), which is `rounded-full`, not
 * `rounded-md`.
 *
 * DEVIATION, deliberate: the spec sets `color: #fff` on the gold fill. White on
 * #c9982a is 2.3:1 and fails AA, so the gold variant takes an ink label — the
 * project rule in CLAUDE.md. Do not "correct" this back to the spec.
 */
const VARIANTS = {
  /**
   * `.btn-primary` — the hero. Ink with a soft shadow, not gold: the spec uses
   * a different class here from the closing CTA, and the first clone reused
   * gold for both. Documenting three variants while shipping two is how that
   * happened.
   *
   * `shadow-card` is the spec's *resting* elevation. The first correction used
   * `shadow-raised`, which is its hover value — leaving the button permanently
   * lifted, and a hover state with nowhere to go.
   */
  primary:
    "bg-ink text-surface text-lg px-[30px] py-3.5 gap-2.5 shadow-card hover:opacity-90",
  /** `.btn-gold` — the closing CTA. White label on gold, matching V7 exactly
   *  (client requires the visual match over the prior AA-contrast note). */
  gold: "bg-gold text-surface text-xl px-9 py-4 gap-2.5 shadow-gold hover:brightness-110 hover:-translate-y-0.5",
  /** `.btn-nav` — the header. Ink, not gold. */
  nav: "bg-ink text-surface text-md px-[22px] py-2.5 gap-2 hover:opacity-[0.82]",
  /** `.btn-nav-ghost` — secondary header action. */
  ghost:
    "border-[1.5px] border-border-strong text-ink text-md px-[18px] py-2.5 gap-2 hover:border-gold hover:bg-surface-soft",
} as const;
export function RequestSessionButton({
  variant = "gold",
  className = "",
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { openRequest } = useLandingDialogs();
  // The header buttons (nav / ghost) trail a right-arrow; the hero/CTA buttons
  // lead with the message icon — matching the V7 spec's two treatments.
  const isHeader = variant === "nav" || variant === "ghost";
  return (
    <button
      type="button"
      onClick={openRequest}
      className={`inline-flex min-h-11 items-center justify-center rounded-full font-semibold transition-[filter,opacity,transform,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:hover:translate-y-0 ${VARIANTS[variant]} ${className}`}
    >
      {isHeader ? null : (
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
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      Request a Session
      {isHeader ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          focusable="false"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      ) : null}
    </button>
  );
}

export function SubmitPhotosButton() {
  const { openPhotoSubmission } = useLandingDialogs();
  return (
    <button
      type="button"
      onClick={openPhotoSubmission}
      className="rounded-md px-1 font-medium text-gold underline underline-offset-4 transition-colors hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      Share your session photos
    </button>
  );
}
