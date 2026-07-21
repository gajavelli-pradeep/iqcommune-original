"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/Field";

/**
 * P7 — set a password against an invite.
 *
 * The email and role are read-only: they come from the invite the token names,
 * not from the person accepting it. Someone who could choose their own role
 * here could invite themselves to be an admin.
 *
 * The password is only ever checked in the browser for immediate feedback. The
 * real rules belong to the auth provider, which has not been wired yet — see
 * the note on `activate`.
 */

export interface AdminInvite {
  email: string;
  role: string;
}

const MINIMUM_LENGTH = 8;

export function AccountSetupForm({ invite, token }: { invite: AdminInvite; token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string>();
  const [activated, setActivated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  /** Posts to the route, which re-verifies the token before writing. */
  async function send(endpoint: string, payload: Record<string, unknown>) {
    setBusy(true);
    setSubmitError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, ...payload }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSubmitError(body?.error?.message ?? "Something went wrong. Please try again.");
        return null;
      }
      // The receipt timestamp comes back from the server, not from this clock.
      return body.data as { at: string };
    } catch {
      setSubmitError("We could not reach the server. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }


  if (activated) {
    return (
      <section className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
            focusable="false"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-1 text-2xl font-semibold text-ink">Account activated</h1>
        <p className="text-base leading-[1.6] text-ink-muted">
          Your account is ready. Log in any time at iqcommune.com/login with this email and the
          password you just set.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h1 className="mb-1 text-3xl font-semibold text-ink">Set up your account</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        You&apos;ve been invited to the iqcommune admin console. Confirm your details and choose a
        password to activate your account.
      </p>

      <dl className="mb-5">
        {(
          [
            ["Email", invite.email],
            ["Role", invite.role],
          ] as ReadonlyArray<[string, string]>
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
          >
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-right text-base font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (password.length < MINIMUM_LENGTH) {
            return setError(`Password must be at least ${MINIMUM_LENGTH} characters.`);
          }
          if (password !== confirmation) {
            return setError("Passwords don't match — check and try again.");
          }
          setError(undefined);
          const receipt = await send("/api/invites", { password });
          if (receipt) setActivated(true);
        }}
      >
        <TextField
          type="password"
          label="Create a password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
        />
        <TextField
          type="password"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmation}
          onChange={setConfirmation}
          error={error}
        />

        {submitError ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {busy ? "Activating…" : "Activate account"}
        </button>
      </form>
    </section>
  );
}
