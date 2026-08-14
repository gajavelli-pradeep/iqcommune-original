"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { focusFirstError } from "@/components/ui/focus-first-error";
import { FormError } from "@/components/ui/FormError";
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

/** Keyed by the field at fault, so each message renders against its own box. */
type FormErrors = Partial<Record<"password" | "confirmation", string>>;

export function AccountSetupForm({ invite, token }: { invite: AdminInvite; token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  // Client-side password validation; `submitError` is the network/route path,
  // now shared (audit H8).
  const [errors, setErrors] = useState<FormErrors>({});
  const [activated, setActivated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
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
    <section className="rounded-[12px] border border-border bg-surface px-9 py-8">
      {/* Both inherit this spec's 1.7; neither .card-title nor .card-sub sets a
          line-height of its own here, unlike /rate's .card-sub. */}
      <h1 className="mb-1.5 text-4xl font-semibold leading-[1.7] text-ink">Set up your account</h1>
      <p className="mb-6 text-md leading-[1.7] text-ink-muted">
        You&apos;ve been invited to the iqcommune admin console. Confirm your details and choose a
        password to activate your account.
      </p>

      {/* V7 .kv-grid: a plain 2-column label-over-value list (title-case labels,
          no box), matching the rate/consent detail grids. */}
      <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-[0.85rem]">
        {(
          [
            ["Email", invite.email],
            ["Role", invite.role],
          ] as ReadonlyArray<[string, string]>
        ).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="mb-0.5 text-xs text-ink-faint">{label}</dt>
            <dd className="truncate text-md font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <form
        ref={formRef}
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          // Each message lands on the field it is about. A short password used to
          // put "must be at least 8 characters" under *Confirm password*, sending
          // the reader to correct the one box that was not the problem.
          const fail = (next: FormErrors) => {
            setErrors(next);
            focusFirstError(formRef.current);
          };
          if (password.length < MINIMUM_LENGTH) {
            return fail({ password: `Password must be at least ${MINIMUM_LENGTH} characters.` });
          }
          if (password !== confirmation) {
            return fail({ confirmation: "Passwords don't match — check and try again." });
          }
          setErrors({});
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
          error={errors.password}
        />
        <TextField
          type="password"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={confirmation}
          onChange={setConfirmation}
          error={errors.confirmation}
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
