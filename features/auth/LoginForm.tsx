"use client";

import { useState } from "react";

import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { useFocusWhen } from "@/hooks/useFocusWhen";

/**
 * Console sign-in form (audit C5). Controlled fields drive a server action; on
 * success the action redirects (its thrown NEXT_REDIRECT navigates), so the only
 * outcome handled here is a returned error.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const errorRef = useFocusWhen<HTMLParagraphElement>(Boolean(error));

  return (
    <form
      className="rounded-lg border border-border bg-surface p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(undefined);
        const result = await signIn(email, password);
        // Reached only on failure — success throws NEXT_REDIRECT and navigates.
        if (result?.error) {
          setError(result.error);
          setBusy(false);
        }
      }}
    >
      <h1 className="mb-1 text-2xl font-semibold text-ink">Sign in to iqcommune</h1>
      <p className="mb-5 text-base text-ink-muted">Console access for the iqcommune team.</p>

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder="you@iqcommune.com"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        placeholder="Your password"
      />

      {error ? (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <FormError message={error} />
        </div>
      ) : null}

      <Button type="submit" variant="submit" busy={busy} busyLabel="Signing in…" disabled={!email.trim() || !password}>
        Sign in
      </Button>
    </form>
  );
}
