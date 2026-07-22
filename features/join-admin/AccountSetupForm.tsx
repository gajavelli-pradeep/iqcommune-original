"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { KeyValueGrid } from "@/components/ui/KeyValueGrid";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import type { AdminInvite } from "@/types/link-pages";

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

// Shape lives in types/, out of the client graph (audit H6); re-exported here.
export type { AdminInvite };

const MINIMUM_LENGTH = 8;

export function AccountSetupForm({ invite, token }: { invite: AdminInvite; token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string>();
  const [activated, setActivated] = useState(false);
  // `error` above is client-side password validation; `submitError` is the
  // network/route path, now shared (audit H8).
  const { submit, busy, error: submitError } = useApiSubmit(token);

  if (activated) {
    return (
      <SuccessPanel
        title="Account activated"
        lede="Your account is ready. Log in any time at iqcommune.com/login with this email and the password you just set."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface px-9 py-8">
      <h1 className="mb-1 text-3xl font-semibold text-ink">Set up your account</h1>
      <p className="mb-5 text-base leading-[1.6] text-ink-muted">
        You&apos;ve been invited to the iqcommune admin console. Confirm your details and choose a
        password to activate your account.
      </p>

      <div className="mb-5">
        <KeyValueGrid
          rows={[
            { label: "Email", value: invite.email },
            { label: "Role", value: invite.role },
          ]}
        />
      </div>

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
          const receipt = await submit("/api/invites", { password });
          if (receipt) setActivated(true);
        }}
      >
        <TextField
          type="password"
          label="Create a password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <TextField
          type="password"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={confirmation}
          onChange={setConfirmation}
          error={error}
        />

        <FormError message={submitError} />

        {/* Ink, not gold (audit H3): the user-setup spec button is ink; this
            call site had shipped gold. */}
        <Button type="submit" variant="submit" busy={busy} busyLabel="Activating…">
          Activate account
        </Button>
      </form>
    </section>
  );
}
