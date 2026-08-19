"use client";

import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/login/actions";

/**
 * First letters of the first two words — "Lekkala Ganesh" → "LG" — the same
 * convention `PersonCell`/`PractitionersPanel` already use for a name-bearing
 * avatar elsewhere in the console.
 */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The header DP, now a real menu — "Change / Reset Password" and "Sign out"
 * (F? follow-up to the invite-admin work). It was `aria-hidden` and inert
 * before; `shrink-0` on the circle is the actual bug fix here — inside the
 * header's flex row a fixed `w-[34px]` still shrinks without it, which is
 * what read as an egg on a narrow header instead of the drawn circle.
 *
 * "Change / Reset Password" links straight to `/reset-password` rather than
 * sending an email — this account already has a session, so there's nothing
 * to prove that a recovery link would prove better. The email round trip is
 * the login page's "Forgot password?" instead, for someone who isn't signed
 * in at all (`ForgotPasswordForm`).
 */
export function ProfileMenu({ name, email }: { name: string | null; email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {name ? initials(name) : email.slice(0, 2).toUpperCase()}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 rounded-md border border-border bg-surface p-1 shadow-raised"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{name ?? email}</p>
          </div>

          <a
            href="/reset-password"
            role="menuitem"
            className="mt-1 flex w-full items-center rounded px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-soft"
          >
            Change / Reset Password
          </a>

          <button
            type="button"
            role="menuitem"
            onClick={() => signOut()}
            className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-soft"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
