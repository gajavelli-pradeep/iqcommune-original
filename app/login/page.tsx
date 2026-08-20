import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FormError } from "@/components/ui/FormError";
import { LoginForm } from "@/features/auth/LoginForm";

/** The console sign-in entry (audit C5). Never indexed — it is a staff gate. */
export const metadata: Metadata = {
  title: "Sign in — iqcommune",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 px-8 py-16">
        <div className="mx-auto max-w-[var(--container-flow)]">
          {error === "invalid-reset-link" ? (
            <FormError message="That password-reset link has expired or was already used. Request a new one from your profile menu once you're signed in." />
          ) : null}
          <LoginForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
