"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useSubmit } from "@/hooks/useSubmit";

/**
 * The signed-out "forgot password" request — client asked for this on the
 * login page specifically, distinct from the profile menu's "change
 * password" (which is a signed-in user setting their own, no email round
 * trip needed).
 *
 * `/api/password-reset` never confirms or denies whether the address has an
 * account, so the confirmation here is the same regardless — genuine sends
 * and unknown addresses look identical, by design.
 */
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { submit, busy, error } = useSubmit();

  if (sent) {
    return (
      <SuccessPanel
        title="Check your inbox"
        lede={`If ${email} has a console account, we've sent a link to reset its password.`}
      >
        <button
          type="button"
          onClick={onBack}
          className="mt-2 text-sm font-medium text-ink underline underline-offset-2"
        >
          Back to sign in
        </button>
      </SuccessPanel>
    );
  }

  return (
    <form
      className="rounded-lg border border-border bg-surface p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const result = await submit("/api/password-reset", { email });
        if (result) setSent(true);
      }}
    >
      <h1 className="mb-1 text-2xl font-semibold text-ink">Reset your password</h1>
      <p className="mb-5 text-base text-ink-muted">
        Enter your console email and we&apos;ll send you a link to reset your password.
      </p>

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder="you@iqcommune.com"
      />

      <FormError message={error} />

      <Button type="submit" variant="submit" busy={busy} busyLabel="Sending…" disabled={!email.trim()}>
        Send reset link
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 block text-sm font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Back to sign in
      </button>
    </form>
  );
}
