"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Deferred (audit H8): the modal body pulls the zod barrel, and this provider
// ships on first paint. Loading it on open keeps zod out of the /practitioners
// bundle.
const ApplyModal = dynamic(() => import("./ApplyModalBody").then((m) => m.ApplyModal));

/**
 * The empanelment-application dialog provider.
 *
 * Same shape as P1's `RequestSession`: the page stays a server component; only
 * this provider and its button ship JavaScript, and the heavy form body loads
 * on demand.
 */

interface ApplyDialog {
  openApply: () => void;
}

const Context = createContext<ApplyDialog | undefined>(undefined);

function useApplyDialog(): ApplyDialog {
  const context = useContext(Context);
  if (!context) throw new Error("ApplyButton must be rendered inside <ApplyProvider>");
  return context;
}

export function ApplyProvider({
  children,
  /** Passed through to the application's mailto fallback. Optional — see there. */
  practitionerEmail,
}: {
  children: ReactNode;
  practitionerEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openApply: () => setOpen(true) }), []);

  return (
    <Context.Provider value={value}>
      {children}
      {open ? (
        <ApplyModal
          open
          onClose={() => setOpen(false)}
          practitionerEmail={practitionerEmail}
        />
      ) : null}
    </Context.Provider>
  );
}

export function ApplyButton({
  label = "Apply to Join the Network",
  icon = "users",
  className = "",
}: {
  label?: string;
  /** V7 uses a leading users icon on the hero button, a trailing arrow on the closing CTA. */
  icon?: "users" | "arrow";
  /** Size overrides for the mobile drawer, where the button spans the panel. */
  className?: string;
}) {
  const { openApply } = useApplyDialog();
  return (
    <button
      type="button"
      onClick={openApply}
      // White label on gold, matching V7 exactly (the client requires the visual
      // match over the AA contrast note that previously kept this ink).
      className={`inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full bg-gold px-9 py-4 text-xl font-semibold text-surface shadow-gold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:hover:translate-y-0 ${className}`}
    >
      {icon === "users" ? (
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
      ) : null}
      {label}
      {icon === "arrow" ? (
        <svg
          width="15"
          height="15"
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
