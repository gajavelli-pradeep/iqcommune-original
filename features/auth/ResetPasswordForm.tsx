"use client";

import { useState } from "react";

import { updatePassword } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { useFocusWhen } from "@/hooks/useFocusWhen";

const MIN_LENGTH = 8;

/**
 * Sets a new password for whichever session is already active — a signed-in
 * admin who came straight here from the profile menu, or someone who followed
 * a "Forgot password?" recovery link through `/auth/confirm`, which turns that
 * link into the same kind of session. Either way this form's only job is
 * collecting the new password and calling `updatePassword`, which fails if
 * there's no session (link expired, already used, or opened directly while
 * signed out).
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const errorRef = useFocusWhen<HTMLParagraphElement>(Boolean(error));

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Password updated</h1>
        <p className="text-base text-ink-muted">
          Use it next time you sign in —{" "}
          <a href="/login" className="font-medium text-ink underline underline-offset-2">
            back to sign in
          </a>
          .
        </p>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <form
      className="rounded-lg border border-border bg-surface p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || mismatch) return;
        setBusy(true);
        setError(undefined);
        const result = await updatePassword(password);
        if (result?.error) {
          setError(result.error);
          setBusy(false);
        } else {
          setDone(true);
        }
      }}
    >
      <h1 className="mb-1 text-2xl font-semibold text-ink">Set a new password</h1>
      <p className="mb-5 text-base text-ink-muted">Choose a new password for your console account.</p>

      <TextField
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={`At least ${MIN_LENGTH} characters.`}
      />
      <TextField
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={mismatch ? "Passwords don't match." : undefined}
      />

      {error ? (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <FormError message={error} />
        </div>
      ) : null}

      <Button
        type="submit"
        variant="submit"
        busy={busy}
        busyLabel="Updating…"
        disabled={password.length < MIN_LENGTH || mismatch}
      >
        Update password
      </Button>
    </form>
  );
}
