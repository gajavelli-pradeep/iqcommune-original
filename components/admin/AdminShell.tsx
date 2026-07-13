"use client";

import { AdminUIProvider } from "@/components/admin/AdminUIContext";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

/** Client wrapper so the top-nav and the console page share UI state (global search, active tab). */
export function AdminShell({
  email,
  isGlobalAdmin = false,
  children,
}: {
  email: string;
  isGlobalAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminUIProvider>
      <AdminTopNav email={email} isGlobalAdmin={isGlobalAdmin} />
      {children}
    </AdminUIProvider>
  );
}
