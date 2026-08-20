import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

/** Landing page for a password-recovery email link. Never indexed. */
export const metadata: Metadata = {
  title: "Reset password — iqcommune",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 px-8 py-16">
        <div className="mx-auto max-w-[var(--container-flow)]">
          <ResetPasswordForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
