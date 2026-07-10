import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { hasConsoleAccess } from "@/lib/supabase/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Admits every console tier (admin, global admin, read-only user) into the shell.
  // Each page self-gates to its own tier; the read-only /user console is rendered
  // with mutations stripped.
  const canConsole =
    !!user &&
    (hasConsoleAccess(user.app_metadata?.role) ||
      (!!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL));

  if (!canConsole) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4" }}>
      <AdminShell email={user!.email ?? ""}>{children}</AdminShell>
    </div>
  );
}
